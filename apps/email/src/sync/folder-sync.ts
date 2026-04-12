import { eq, and, notInArray } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { emailFolders } from "@repo/shared/db/schema";
import type { ImapFlow } from "imapflow";
import type { FolderType } from "@repo/shared/types";
import { logger } from "../config";

/**
 * Map IMAP special-use flags to our folder types.
 */
function mapFolderType(flags: Set<string>, name: string): FolderType {
  if (flags.has("\\Inbox") || name.toUpperCase() === "INBOX") return "inbox";
  if (flags.has("\\Sent")) return "sent";
  if (flags.has("\\Drafts")) return "drafts";
  if (flags.has("\\Trash") || flags.has("\\Junk")) return "trash";
  if (flags.has("\\Spam")) return "spam";
  if (flags.has("\\Archive") || flags.has("\\All")) return "archive";
  return "custom";
}

interface FolderSyncResult {
  synced: number;
  removed: number;
}

/**
 * Discover and sync IMAP folders to the database.
 * Creates new folders, updates existing ones, removes deleted.
 */
export async function syncFolders(
  client: ImapFlow,
  accountId: string,
): Promise<FolderSyncResult> {
  const result: FolderSyncResult = { synced: 0, removed: 0 };

  // List all mailboxes from IMAP
  const mailboxes = await client.list();
  const syncedPaths: string[] = [];

  for (const mailbox of mailboxes) {
    // Skip non-selectable folders (containers only)
    if (
      mailbox.flags?.has("\\Noselect") ||
      mailbox.flags?.has("\\NonExistent")
    ) {
      continue;
    }

    const folderPath = mailbox.path;
    const folderName = mailbox.name;
    const folderType = mapFolderType(mailbox.flags ?? new Set(), folderName);

    syncedPaths.push(folderPath);

    // Get status for message counts
    let totalMessages = 0;
    let unreadMessages = 0;

    try {
      const status = await client.status(folderPath, {
        messages: true,
        unseen: true,
        uidValidity: true,
      });
      totalMessages = status.messages ?? 0;
      unreadMessages = status.unseen ?? 0;

      // Upsert folder
      const [existing] = await db
        .select({ id: emailFolders.id })
        .from(emailFolders)
        .where(
          and(
            eq(emailFolders.emailAccountId, accountId),
            eq(emailFolders.path, folderPath),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(emailFolders)
          .set({
            name: folderName,
            type: folderType,
            totalMessages,
            unreadMessages,
            uidValidity:
              status.uidValidity != null ? Number(status.uidValidity) : null,
          })
          .where(eq(emailFolders.id, existing.id));
      } else {
        await db.insert(emailFolders).values({
          emailAccountId: accountId,
          name: folderName,
          path: folderPath,
          type: folderType,
          totalMessages,
          unreadMessages,
          uidValidity:
            status.uidValidity != null ? Number(status.uidValidity) : null,
        });
      }

      result.synced++;
    } catch (err) {
      logger.warn(
        { err, folder: folderPath, accountId },
        "Failed to sync folder status",
      );
    }
  }

  // Remove folders that no longer exist on IMAP
  if (syncedPaths.length > 0) {
    const deleted = await db
      .delete(emailFolders)
      .where(
        and(
          eq(emailFolders.emailAccountId, accountId),
          notInArray(emailFolders.path, syncedPaths),
        ),
      )
      .returning({ id: emailFolders.id });

    result.removed = deleted.length;
  }

  return result;
}
