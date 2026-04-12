/**
 * One-time script to reset all threadIds after removing subject-based thread matching.
 *
 * Algorithm:
 * 1. Set threadId = messageId for all emails where inReplyTo IS NULL (thread starters)
 * 2. For emails with inReplyTo, look up parent's threadId and assign it
 * 3. If parent not found, set threadId = messageId (orphan becomes new thread)
 *
 * Usage: DATABASE_URL=... npx tsx scripts/reset-thread-ids.ts
 */

import { eq, isNull, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { emails } from "@repo/shared/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function resetThreadIds() {
  console.log("Starting thread ID reset...");

  // Step 1: Reset all thread starters (no inReplyTo) to use their own messageId
  const startersResult = await db
    .update(emails)
    .set({ threadId: sql`${emails.messageId}` })
    .where(isNull(emails.inReplyTo))
    .returning({ id: emails.id });

  console.log(
    `Reset ${startersResult.length} thread starters (inReplyTo IS NULL)`,
  );

  // Step 2: Resolve children — emails with inReplyTo
  // We do multiple passes because chains can be multi-level (A -> B -> C)
  let resolved = 0;
  let pass = 0;
  const maxPasses = 20;

  do {
    pass++;
    // Update emails whose parent (matched by inReplyTo -> messageId) already has a resolved threadId
    const result = await db.execute(sql`
      UPDATE emails AS child
      SET thread_id = parent.thread_id
      FROM emails AS parent
      WHERE child.in_reply_to IS NOT NULL
        AND child.in_reply_to = parent.message_id
        AND child.email_account_id = parent.email_account_id
        AND child.thread_id != parent.thread_id
    `);

    resolved = Number(result.count ?? 0);
    console.log(`Pass ${pass}: resolved ${resolved} child emails`);
  } while (resolved > 0 && pass < maxPasses);

  // Step 3: Orphans — emails with inReplyTo but no matching parent in DB
  const orphansResult = await db.execute(sql`
    UPDATE emails AS child
    SET thread_id = child.message_id
    WHERE child.in_reply_to IS NOT NULL
      AND child.thread_id = child.message_id
      AND NOT EXISTS (
        SELECT 1 FROM emails AS parent
        WHERE parent.message_id = child.in_reply_to
          AND parent.email_account_id = child.email_account_id
      )
  `);

  // Also set orphans where threadId is still wrong (pointing to old subject-matched thread)
  const remainingOrphans = await db.execute(sql`
    UPDATE emails AS child
    SET thread_id = child.message_id
    WHERE child.in_reply_to IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM emails AS parent
        WHERE parent.message_id = child.in_reply_to
          AND parent.email_account_id = child.email_account_id
      )
  `);

  console.log(
    `Set ${Number(remainingOrphans.count ?? 0)} orphan emails to their own threadId`,
  );

  // Summary
  const totalEmails = await db
    .select({ count: sql<number>`count(*)` })
    .from(emails);

  const uniqueThreads = await db
    .select({ count: sql<number>`count(distinct thread_id)` })
    .from(emails);

  console.log(
    `\nDone! Total emails: ${totalEmails[0].count}, Unique threads: ${uniqueThreads[0].count}`,
  );

  await client.end();
}

resetThreadIds().catch((err) => {
  console.error("Failed to reset thread IDs:", err);
  process.exit(1);
});
