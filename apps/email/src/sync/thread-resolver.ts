import { eq, and } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { emails } from "@repo/shared/db/schema";

/**
 * Determine thread ID for an email.
 * Uses In-Reply-To header to find existing thread, otherwise creates new.
 */
export async function resolveThreadId(
  messageId: string,
  inReplyTo: string | undefined,
  _subject: string,
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

  // New thread — use this email's messageId as threadId
  return messageId;
}
