import { z } from "zod";
import { passwordSchema } from "./auth";

export const SUPPORTED_CURRENCIES = ["EUR", "USD", "CHF"] as const;
export const SUPPORTED_LANGUAGES = ["de", "en"] as const;

const KPI_PERIOD_VALUES = [
  "current_month",
  "last_month",
  "current_year",
  "last_year",
] as const;

export const updateProfileInput = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  emailSignature: z.string().max(2000).nullable(),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
});

export const updatePreferencesInput = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  language: z.enum(SUPPORTED_LANGUAGES),
  taxRate: z.number().int().min(0).max(10000).nullable(),
  retirementYear: z.number().int().min(2024).max(2100).nullable(),
  healthScoreCashflowWeight: z.number().int().min(0).max(100),
  healthScoreLtvWeight: z.number().int().min(0).max(100),
  healthScoreYieldWeight: z.number().int().min(0).max(100),
  kpiPeriod: z.enum(KPI_PERIOD_VALUES),
  dscrTarget: z.number().int().min(50).max(500),
  donutThreshold: z.number().int().min(1).max(50),
  brokerFeeDefault: z.number().int().min(0).max(10000),
  shareLinkValidityDays: z.number().int().min(1).max(365),
  annualAppreciationDefault: z.number().int().min(0).max(5000),
  capitalGainsTax: z.number().int().min(0).max(10000),
  pushEnabled: z.boolean(),
  notifyNewEmail: z.boolean(),
  notifyOverdueRent: z.boolean(),
  notifyContractExpiry: z.boolean(),
  trackingPixelEnabled: z.boolean(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>;
