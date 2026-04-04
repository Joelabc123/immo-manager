import { registerCronJob } from "../cron";
import { syncAllEmailAccounts } from "../services/email-sync";

/**
 * Register the email sync cron job.
 * Runs every 15 minutes to fetch new emails from all configured IMAP accounts.
 */
export function registerEmailSyncJob(): void {
  registerCronJob({
    name: "email-sync",
    schedule: "*/15 * * * *",
    handler: syncAllEmailAccounts,
  });
}
