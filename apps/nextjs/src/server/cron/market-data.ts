import { registerCronJob } from "./index";
import { syncEcbInterestRates } from "../services/market-data";

/**
 * Register the market data sync cron job.
 * Runs daily at 06:00 to fetch latest ECB interest rates.
 */
export function registerMarketDataSyncJob(): void {
  registerCronJob({
    name: "market-data-sync",
    schedule: "0 6 * * *",
    handler: async () => {
      await syncEcbInterestRates();
    },
  });
}
