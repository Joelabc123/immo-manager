import { router } from "../trpc";
import { authRouter } from "./auth";
import { sessionsRouter } from "./sessions";
import { adminRouter } from "./admin";
import { propertiesRouter } from "./properties";
import { tagsRouter } from "./tags";
import { loansRouter } from "./loans";
import { rentalUnitsRouter } from "./rental-units";
import { tenantsRouter } from "./tenants";
import { rentPaymentsRouter } from "./rent-payments";
import { expensesRouter } from "./expenses";
import { dunningRouter } from "./dunning";
import { rentAdjustmentsRouter } from "./rent-adjustments";
import { dashboardRouter } from "./dashboard";
import { dashboardPresetsRouter } from "./dashboard-presets";
import { scenariosRouter } from "./scenarios";
import { analysisRouter } from "./analysis";
import { emailRouter } from "./email";
import { notificationsRouter } from "./notifications";
import { documentsRouter } from "./documents";
import { shareLinksRouter } from "./share-links";
import { auditRouter } from "./audit";
import { marketDataRouter } from "./market-data";
import { userSettingsRouter } from "./user-settings";
import { tasksRouter } from "./tasks";
import { aiRouter } from "./ai";

export const appRouter = router({
  auth: authRouter,
  sessions: sessionsRouter,
  admin: adminRouter,
  properties: propertiesRouter,
  tags: tagsRouter,
  loans: loansRouter,
  rentalUnits: rentalUnitsRouter,
  tenants: tenantsRouter,
  rentPayments: rentPaymentsRouter,
  expenses: expensesRouter,
  dunning: dunningRouter,
  rentAdjustments: rentAdjustmentsRouter,
  dashboard: dashboardRouter,
  dashboardPresets: dashboardPresetsRouter,
  scenarios: scenariosRouter,
  analysis: analysisRouter,
  email: emailRouter,
  notifications: notificationsRouter,
  documents: documentsRouter,
  shareLinks: shareLinksRouter,
  audit: auditRouter,
  marketData: marketDataRouter,
  userSettings: userSettingsRouter,
  tasks: tasksRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
