import cron, { type ScheduledTask } from "node-cron";

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
    console.warn(`[CRON] Job "${job.name}" is already registered, skipping.`);
    return;
  }

  const task = cron.schedule(job.schedule, async () => {
    console.log(`[CRON] Running job: ${job.name}`);
    try {
      await job.handler();
      console.log(`[CRON] Job "${job.name}" completed successfully.`);
    } catch (error) {
      console.error(`[CRON] Job "${job.name}" failed:`, error);
    }
  });

  registeredJobs.set(job.name, task);
  console.log(
    `[CRON] Registered job: "${job.name}" with schedule "${job.schedule}"`,
  );
}

/**
 * Stop a specific cron job
 */
export function stopCronJob(name: string): void {
  const task = registeredJobs.get(name);
  if (task) {
    task.stop();
    registeredJobs.delete(name);
    console.log(`[CRON] Stopped job: "${name}"`);
  }
}

/**
 * Stop all registered cron jobs
 */
export function stopAllCronJobs(): void {
  for (const [name, task] of registeredJobs) {
    task.stop();
    console.log(`[CRON] Stopped job: "${name}"`);
  }
  registeredJobs.clear();
}

/**
 * Initialize all cron jobs
 * Import and register your jobs here
 */
export function initCronJobs(): void {
  console.log("[CRON] Initializing cron jobs...");

  // Register jobs here, e.g.:
  // registerCronJob({
  //   name: "fetch-emails",
  //   schedule: "*/5 * * * *", // every 5 minutes
  //   handler: async () => { await fetchEmails(); },
  // });

  console.log("[CRON] Cron jobs initialized.");
}
