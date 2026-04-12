import { eq } from "drizzle-orm";
import cron from "node-cron";
import { db } from "@repo/shared/db";
import { emailAccounts } from "@repo/shared/db/schema";
import { config, logger, validateConfig } from "./config";
import {
  initRedis,
  onSyncRequest,
  onAccountUpdated,
  shutdownRedis,
} from "./events/redis-events";
import { syncEmailAccount, syncAllEmailAccounts } from "./sync/email-sync";

// Map of accountId -> cron task for per-account scheduling
const scheduledJobs = new Map<string, cron.ScheduledTask>();

// Convert minutes to a cron expression.
// e.g. 5 -> "star/5 * * * *", 60 -> "0 * * * *"
function minutesToCron(minutes: number): string {
  if (minutes >= 60) return "0 * * * *";
  return `*/${minutes} * * * *`;
}

/**
 * Schedule a sync job for a specific account.
 */
function scheduleAccount(accountId: string, intervalMinutes: number): void {
  // Cancel existing job if any
  const existing = scheduledJobs.get(accountId);
  if (existing) {
    existing.stop();
  }

  const cronExpr = minutesToCron(intervalMinutes);
  const task = cron.schedule(cronExpr, async () => {
    try {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, accountId))
        .limit(1);

      if (!account || !account.isActive) {
        // Account deleted or deactivated, remove job
        task.stop();
        scheduledJobs.delete(accountId);
        return;
      }

      // Skip if already syncing
      if (account.syncStatus === "syncing") {
        logger.debug({ accountId }, "Skipping sync — already in progress");
        return;
      }

      await syncEmailAccount(account);
    } catch (err) {
      logger.error({ err, accountId }, "Scheduled sync failed");
    }
  });

  scheduledJobs.set(accountId, task);
  logger.info(
    { accountId, intervalMinutes, cron: cronExpr },
    "Scheduled sync job",
  );
}

/**
 * Load all active accounts from DB and schedule their sync jobs.
 */
async function scheduleAllAccounts(): Promise<void> {
  const accounts = await db
    .select({
      id: emailAccounts.id,
      syncIntervalMinutes: emailAccounts.syncIntervalMinutes,
      isActive: emailAccounts.isActive,
    })
    .from(emailAccounts)
    .where(eq(emailAccounts.isActive, true));

  for (const account of accounts) {
    scheduleAccount(account.id, account.syncIntervalMinutes);
  }

  logger.info(
    { count: accounts.length },
    "Loaded and scheduled all active accounts",
  );
}

/**
 * Handle manual sync requests from Next.js.
 */
function setupEventListeners(): void {
  // Manual sync request
  onSyncRequest(async (payload) => {
    logger.info({ accountId: payload.accountId }, "Manual sync requested");

    try {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, payload.accountId))
        .limit(1);

      if (!account) {
        logger.warn(
          { accountId: payload.accountId },
          "Account not found for sync request",
        );
        return;
      }

      if (account.syncStatus === "syncing") {
        logger.info(
          { accountId: payload.accountId },
          "Sync already in progress, skipping",
        );
        return;
      }

      await syncEmailAccount(account);
    } catch (err) {
      logger.error({ err, accountId: payload.accountId }, "Manual sync failed");
    }
  });

  // Account created/updated/deleted
  onAccountUpdated(async (payload) => {
    logger.info(
      { accountId: payload.accountId, action: payload.action },
      "Account update event received",
    );

    if (payload.action === "delete") {
      const existingJob = scheduledJobs.get(payload.accountId);
      if (existingJob) {
        existingJob.stop();
        scheduledJobs.delete(payload.accountId);
      }
      return;
    }

    // For create/update: (re-)schedule the job
    const [account] = await db
      .select({
        id: emailAccounts.id,
        syncIntervalMinutes: emailAccounts.syncIntervalMinutes,
        isActive: emailAccounts.isActive,
      })
      .from(emailAccounts)
      .where(eq(emailAccounts.id, payload.accountId))
      .limit(1);

    if (!account) return;

    if (account.isActive) {
      scheduleAccount(account.id, account.syncIntervalMinutes);

      // Run initial sync for newly created accounts
      if (payload.action === "create") {
        const [fullAccount] = await db
          .select()
          .from(emailAccounts)
          .where(eq(emailAccounts.id, payload.accountId))
          .limit(1);

        if (fullAccount) {
          logger.info(
            { accountId: payload.accountId },
            "Running initial sync for new account",
          );
          await syncEmailAccount(fullAccount);
        }
      }
    } else {
      // Deactivated — cancel job
      const existingJob = scheduledJobs.get(account.id);
      if (existingJob) {
        existingJob.stop();
        scheduledJobs.delete(account.id);
      }
    }
  });
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(): Promise<void> {
  logger.info("Shutting down email service...");

  // Stop all cron jobs
  for (const [id, task] of scheduledJobs) {
    task.stop();
    scheduledJobs.delete(id);
  }

  await shutdownRedis();
  logger.info("Email service stopped");
  process.exit(0);
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  logger.info("Starting email microservice...");

  // Validate configuration
  validateConfig();

  // Initialize Redis
  await initRedis();

  // Setup event listeners
  setupEventListeners();

  // Schedule sync jobs for all active accounts
  await scheduleAllAccounts();

  // Run initial sync for all accounts on startup
  logger.info("Running initial sync for all accounts...");
  await syncAllEmailAccounts();

  logger.info("Email microservice is running");

  // Handle graceful shutdown
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "Email microservice failed to start");
  process.exit(1);
});
