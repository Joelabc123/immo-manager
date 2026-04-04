import cron, { type ScheduledTask } from "node-cron";
import { logger } from "@/lib/logger";

interface CronJobDefinition {
  name: string;
  schedule: string;
  handler: () => void | Promise<void>;
}

const registeredJobs: Map<string, ScheduledTask> = new Map();

/**
 * Register and start a cron job
 */
export function registerCronJob(job: CronJobDefinition): void {
  if (registeredJobs.has(job.name)) {
    logger.warn({ job: job.name }, "Cron job already registered, skipping");
    return;
  }

  const task = cron.schedule(job.schedule, async () => {
    logger.info({ job: job.name }, "Running cron job");
    try {
      await job.handler();
      logger.info({ job: job.name }, "Cron job completed");
    } catch (error) {
      logger.error({ job: job.name, err: error }, "Cron job failed");
    }
  });

  registeredJobs.set(job.name, task);
  logger.info({ job: job.name, schedule: job.schedule }, "Registered cron job");
}

/**
 * Stop a specific cron job
 */
export function stopCronJob(name: string): void {
  const task = registeredJobs.get(name);
  if (task) {
    task.stop();
    registeredJobs.delete(name);
    logger.info({ job: name }, "Stopped cron job");
  }
}

/**
 * Stop all registered cron jobs
 */
export function stopAllCronJobs(): void {
  for (const [name, task] of registeredJobs) {
    task.stop();
    logger.info({ job: name }, "Stopped cron job");
  }
  registeredJobs.clear();
}

/**
 * Initialize all cron jobs
 * Import and register your jobs here
 */
export function initCronJobs(): void {
  console.log("[CRON] Initializing cron jobs...");

  // Email sync: fetch new emails every 15 minutes
  import("./email-sync").then(({ registerEmailSyncJob }) => {
    registerEmailSyncJob();
  });

  // Market data sync: fetch ECB interest rates daily at 06:00
  import("./market-data").then(({ registerMarketDataSyncJob }) => {
    registerMarketDataSyncJob();
  });

  console.log("[CRON] Cron jobs initialized.");
}
