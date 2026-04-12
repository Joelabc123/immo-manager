import { eq, and } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { emailAccounts, emailFolders, emails } from "@repo/shared/db/schema";
import { decryptCredential } from "@repo/shared/utils";
import type { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { withImapClient } from "../transport/imap-client";
import { syncFolders } from "./folder-sync";
import { resolveThreadId } from "./thread-resolver";
import { matchSenderToTenant } from "./tenant-matcher";
import {
  publishNewEmails,
  publishSyncComplete,
  publishSyncError,
} from "../events/redis-events";
import { config, logger } from "../config";

interface SyncResult {
  newEmails: number;
  matched: number;
  errors: number;
}

interface EmailAccountRow {
  id: string;
  userId: string;
  imapHost: string;
  imapPort: number;
  username: string;
  encryptedPassword: string;
  encryptionIv: string;
  encryptionTag: string;
  fromAddress: string;
}

/**
 * Generate a snippet from email text body (first ~200 chars).
 */
function generateSnippet(text: string | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 200 ? cleaned.slice(0, 200) + "..." : cleaned;
}

/**
 * Sync all emails in a single IMAP folder.
 */
async function syncFolder(
  client: ImapFlow,
  accountId: string,
  userId: string,
  folderId: string,
  folderPath: string,
): Promise<SyncResult> {
  const result: SyncResult = { newEmails: 0, matched: 0, errors: 0 };

  // Get folder metadata from DB
  const [folder] = await db
    .select()
    .from(emailFolders)
    .where(eq(emailFolders.id, folderId))
    .limit(1);

  if (!folder) return result;

  let lock;
  try {
    lock = await client.getMailboxLock(folderPath);
  } catch (err) {
    logger.warn({ err, folder: folderPath }, "Cannot lock mailbox, skipping");
    return result;
  }

  try {
    const mailboxStatus = client.mailbox;
    if (!mailboxStatus) {
      return result;
    }

    const currentUidValidity = mailboxStatus.uidValidity
      ? Number(mailboxStatus.uidValidity)
      : null;

    // Check if uidValidity changed (mailbox reset)
    const uidValidityChanged =
      folder.uidValidity !== null &&
      currentUidValidity !== null &&
      folder.uidValidity !== currentUidValidity;

    if (uidValidityChanged) {
      logger.info(
        { folder: folderPath, accountId },
        "UID validity changed, re-syncing folder from scratch",
      );
      // Delete all existing emails for this folder (will re-sync)
      await db.delete(emails).where(eq(emails.folderId, folderId));
    }

    // Determine which UIDs to fetch
    const lastUid = uidValidityChanged ? 0 : (folder.lastSyncUid ?? 0);
    const searchRange = lastUid > 0 ? `${lastUid + 1}:*` : "1:*";

    // Get existing message IDs for dedup
    const existingEmails = await db
      .select({ messageId: emails.messageId })
      .from(emails)
      .where(eq(emails.folderId, folderId));

    const existingMessageIds = new Set(existingEmails.map((e) => e.messageId));

    let highestUid = lastUid;
    let fetchCount = 0;
    const maxPerFolder = 200;

    // Determine if this is an inbox-type folder for tenant matching
    const isInboxType = folder.type === "inbox";

    for await (const message of client.fetch(
      { uid: searchRange },
      {
        envelope: true,
        uid: true,
        flags: true,
        bodyStructure: true,
        source: true,
      },
    )) {
      if (fetchCount >= maxPerFolder) break;
      fetchCount++;

      const envelope = message.envelope;
      if (!envelope?.messageId) continue;

      // Skip duplicates
      if (existingMessageIds.has(envelope.messageId)) {
        // Still track highest UID
        if (message.uid > highestUid) highestUid = message.uid;
        continue;
      }

      try {
        // Parse full email source for body
        let htmlBody: string | null = null;
        let textBody: string | null = null;
        let hasAttachments = false;

        if (message.source) {
          const parsed = await simpleParser(message.source);
          htmlBody = parsed.html || null;
          textBody = parsed.text || null;
          hasAttachments = (parsed.attachments?.length ?? 0) > 0;
        }

        const fromAddress = envelope.from?.[0]?.address || "";
        const toAddresses =
          envelope.to
            ?.map((addr: { address?: string }) => addr.address)
            .filter(Boolean)
            .join(", ") || null;
        const messageId = envelope.messageId;
        const inReplyTo = envelope.inReplyTo || undefined;
        const subject = envelope.subject || "(No Subject)";
        const receivedAt = envelope.date || new Date();
        const flags = message.flags
          ? Array.from(message.flags).join(",")
          : null;
        const isRead = message.flags?.has("\\Seen") ?? false;
        const isSent = folder.type === "sent";

        // Resolve thread
        const threadId = await resolveThreadId(
          messageId,
          inReplyTo,
          subject,
          accountId,
        );

        // Match sender to tenant (only for inbound emails / inbox)
        let tenantMatch: {
          tenantId: string;
          propertyId: string | null;
        } | null = null;

        if (isInboxType && !isSent) {
          tenantMatch = await matchSenderToTenant(fromAddress, userId);
        }

        const snippet = generateSnippet(textBody ?? undefined);

        await db.insert(emails).values({
          emailAccountId: accountId,
          folderId,
          tenantId: tenantMatch?.tenantId ?? null,
          propertyId: tenantMatch?.propertyId ?? null,
          messageId,
          inReplyTo: inReplyTo ?? null,
          threadId,
          fromAddress,
          toAddresses,
          subject,
          htmlBody,
          textBody,
          snippet,
          receivedAt: new Date(receivedAt),
          isRead,
          isInbound: !isSent,
          uid: message.uid,
          flags,
          size: message.source?.length ?? null,
          hasAttachments,
        });

        result.newEmails++;
        if (tenantMatch) result.matched++;
        if (message.uid > highestUid) highestUid = message.uid;
      } catch (error) {
        logger.warn(
          { err: error, messageId: envelope.messageId, folder: folderPath },
          "Failed to process email during sync",
        );
        result.errors++;
      }
    }

    // Update folder sync state
    await db
      .update(emailFolders)
      .set({
        lastSyncUid: highestUid > 0 ? highestUid : folder.lastSyncUid,
        lastSyncAt: new Date(),
        uidValidity: currentUidValidity,
        totalMessages: mailboxStatus.exists ?? folder.totalMessages,
      })
      .where(eq(emailFolders.id, folderId));
  } finally {
    lock.release();
  }

  return result;
}

/**
 * Full sync for a single email account: folders first, then emails in each folder.
 */
export async function syncEmailAccount(
  account: EmailAccountRow,
): Promise<SyncResult> {
  const totalResult: SyncResult = { newEmails: 0, matched: 0, errors: 0 };

  // Mark account as syncing
  await db
    .update(emailAccounts)
    .set({ syncStatus: "syncing", syncError: null })
    .where(eq(emailAccounts.id, account.id));

  let password: string;
  try {
    password = decryptCredential(
      account.encryptedPassword,
      account.encryptionIv,
      account.encryptionTag,
      config.encryption.key,
    );
  } catch {
    const errorMsg = "Failed to decrypt email password";
    logger.error({ accountId: account.id }, errorMsg);
    await db
      .update(emailAccounts)
      .set({ syncStatus: "error", syncError: errorMsg })
      .where(eq(emailAccounts.id, account.id));
    await publishSyncError(account.id, account.userId, errorMsg);
    return { ...totalResult, errors: 1 };
  }

  try {
    await withImapClient(
      {
        host: account.imapHost,
        port: account.imapPort,
        username: account.username,
        password,
      },
      async (client) => {
        // Step 1: Sync folders
        const folderResult = await syncFolders(client, account.id);
        logger.info(
          {
            accountId: account.id,
            synced: folderResult.synced,
            removed: folderResult.removed,
          },
          "Folder sync completed",
        );

        // Step 2: Get all folders and sync emails in each
        const folders = await db
          .select()
          .from(emailFolders)
          .where(eq(emailFolders.emailAccountId, account.id));

        for (const folder of folders) {
          try {
            const folderSync = await syncFolder(
              client,
              account.id,
              account.userId,
              folder.id,
              folder.path,
            );

            totalResult.newEmails += folderSync.newEmails;
            totalResult.matched += folderSync.matched;
            totalResult.errors += folderSync.errors;
          } catch (err) {
            logger.warn(
              { err, folder: folder.path, accountId: account.id },
              "Failed to sync folder emails",
            );
            totalResult.errors++;
          }
        }
      },
    );

    // Mark account as idle
    await db
      .update(emailAccounts)
      .set({
        syncStatus: "idle",
        syncError: null,
        lastSyncAt: new Date(),
      })
      .where(eq(emailAccounts.id, account.id));

    // Publish events
    if (totalResult.newEmails > 0) {
      await publishNewEmails(account.id, account.userId, totalResult.newEmails);
    }
    await publishSyncComplete(
      account.id,
      account.userId,
      totalResult.newEmails,
      totalResult.matched,
      totalResult.errors,
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Email sync failed";
    logger.error({ err: error, accountId: account.id }, "Email sync failed");
    await db
      .update(emailAccounts)
      .set({ syncStatus: "error", syncError: errorMsg })
      .where(eq(emailAccounts.id, account.id));
    await publishSyncError(account.id, account.userId, errorMsg);
    totalResult.errors++;
  }

  logger.info(
    {
      accountId: account.id,
      newEmails: totalResult.newEmails,
      matched: totalResult.matched,
      errors: totalResult.errors,
    },
    "Email account sync completed",
  );

  return totalResult;
}

/**
 * Sync all active email accounts.
 */
export async function syncAllEmailAccounts(): Promise<void> {
  const accounts = await db
    .select()
    .from(emailAccounts)
    .where(eq(emailAccounts.isActive, true));

  logger.info(
    { accountCount: accounts.length },
    "Starting email sync for all accounts",
  );

  for (const account of accounts) {
    try {
      await syncEmailAccount(account);
    } catch (error) {
      logger.error(
        { err: error, accountId: account.id },
        "Failed to sync email account",
      );
    }
  }
}
