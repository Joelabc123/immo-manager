import { eq, and, desc } from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  emailAccounts,
  emails,
  tenantEmails,
  tenants,
  rentalUnits,
} from "@repo/shared/db/schema";
import { decryptEmailPassword } from "./email-crypto";
import { logger } from "@/lib/logger";

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
  smtpHost: string;
  smtpPort: number;
  username: string;
  encryptedPassword: string;
  encryptionIv: string;
  encryptionTag: string;
  fromAddress: string;
}

/**
 * Match an email sender address against all tenant email addresses
 * for the given user. Returns tenantId and propertyId if matched.
 */
async function matchSenderToTenant(
  fromAddress: string,
  userId: string,
): Promise<{ tenantId: string; propertyId: string | null } | null> {
  // Extract email from "Name <email>" format
  const emailMatch = fromAddress.match(/<([^>]+)>/);
  const cleanEmail = emailMatch ? emailMatch[1] : fromAddress;
  const normalizedEmail = cleanEmail.toLowerCase().trim();

  const results = await db
    .select({
      tenantId: tenantEmails.tenantId,
      rentalUnitId: tenants.rentalUnitId,
    })
    .from(tenantEmails)
    .innerJoin(tenants, eq(tenantEmails.tenantId, tenants.id))
    .where(
      and(eq(tenantEmails.email, normalizedEmail), eq(tenants.userId, userId)),
    )
    .limit(1);

  if (results.length === 0) return null;

  const result = results[0];
  let propertyId: string | null = null;

  if (result.rentalUnitId) {
    const [unit] = await db
      .select({ propertyId: rentalUnits.propertyId })
      .from(rentalUnits)
      .where(eq(rentalUnits.id, result.rentalUnitId))
      .limit(1);

    if (unit) {
      propertyId = unit.propertyId;
    }
  }

  return { tenantId: result.tenantId, propertyId };
}

/**
 * Determine thread ID for an email.
 * Uses In-Reply-To header to find existing thread, otherwise creates new.
 */
async function resolveThreadId(
  messageId: string,
  inReplyTo: string | undefined,
  subject: string,
  accountId: string,
): Promise<string> {
  // If this is a reply, find the parent email's thread
  if (inReplyTo) {
    const [parent] = await db
      .select({ threadId: emails.threadId })
      .from(emails)
      .where(
        and(
          eq(emails.messageId, inReplyTo),
          eq(emails.emailAccountId, accountId),
        ),
      )
      .limit(1);

    if (parent?.threadId) return parent.threadId;
  }

  // Fallback: strip Re:/Fwd: and try to find matching subject thread
  const cleanSubject = subject.replace(/^(Re|Fwd|AW|WG):\s*/gi, "").trim();

  if (cleanSubject) {
    const [existing] = await db
      .select({ threadId: emails.threadId })
      .from(emails)
      .where(
        and(
          eq(emails.emailAccountId, accountId),
          eq(emails.subject, cleanSubject),
        ),
      )
      .orderBy(desc(emails.receivedAt))
      .limit(1);

    if (existing?.threadId) return existing.threadId;
  }

  // New thread — use this email's messageId as threadId
  return messageId;
}

/**
 * Sync emails from an IMAP account.
 * Fetches new emails since last sync, stores metadata, matches tenants, assigns threads.
 */
export async function syncEmailAccount(
  account: EmailAccountRow,
): Promise<SyncResult> {
  const result: SyncResult = { newEmails: 0, matched: 0, errors: 0 };

  let password: string;
  try {
    password = decryptEmailPassword(account);
  } catch {
    logger.error({ accountId: account.id }, "Failed to decrypt email password");
    return { ...result, errors: 1 };
  }

  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapPort === 993,
      auth: { user: account.username, pass: password },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Find last synced email date to only fetch newer ones
      const [lastEmail] = await db
        .select({ receivedAt: emails.receivedAt })
        .from(emails)
        .where(eq(emails.emailAccountId, account.id))
        .orderBy(desc(emails.receivedAt))
        .limit(1);

      // Fetch emails since last sync (or last 30 days if first sync)
      const since = lastEmail?.receivedAt
        ? new Date(lastEmail.receivedAt.getTime() - 60000) // 1 min overlap to avoid gaps
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get existing message IDs to skip duplicates
      const existingEmails = await db
        .select({ messageId: emails.messageId })
        .from(emails)
        .where(eq(emails.emailAccountId, account.id));

      const existingMessageIds = new Set(
        existingEmails.map((e) => e.messageId),
      );

      let fetchCount = 0;
      const maxEmails = 100;

      for await (const message of client.fetch(
        { since },
        {
          envelope: true,
          uid: true,
        },
      )) {
        if (fetchCount >= maxEmails) break;
        fetchCount++;

        const envelope = message.envelope;
        if (!envelope?.messageId) continue;

        // Skip already synced
        if (existingMessageIds.has(envelope.messageId)) continue;

        const fromAddress = envelope.from?.[0]
          ? envelope.from[0].address || ""
          : "";

        const messageId = envelope.messageId;
        const inReplyTo = envelope.inReplyTo || undefined;
        const subject = envelope.subject || "(No Subject)";
        const receivedAt = envelope.date || new Date();

        try {
          // Resolve thread
          const threadId = await resolveThreadId(
            messageId,
            inReplyTo,
            subject,
            account.id,
          );

          // Match sender to tenant
          const match = await matchSenderToTenant(fromAddress, account.userId);

          await db.insert(emails).values({
            emailAccountId: account.id,
            tenantId: match?.tenantId ?? null,
            propertyId: match?.propertyId ?? null,
            messageId,
            inReplyTo: inReplyTo ?? null,
            threadId,
            fromAddress,
            subject,
            receivedAt: new Date(receivedAt),
            isRead: false,
            isInbound: true,
          });

          result.newEmails++;
          if (match) result.matched++;
        } catch (error) {
          logger.warn(
            { err: error, messageId },
            "Failed to process email during sync",
          );
          result.errors++;
        }
      }
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (error) {
    logger.error({ err: error, accountId: account.id }, "Email sync failed");
    result.errors++;
  }

  logger.info(
    {
      accountId: account.id,
      newEmails: result.newEmails,
      matched: result.matched,
      errors: result.errors,
    },
    "Email sync completed",
  );

  return result;
}

/**
 * Sync all email accounts for all users.
 * Called by the cron job.
 */
export async function syncAllEmailAccounts(): Promise<void> {
  const accounts = await db.select().from(emailAccounts);

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
