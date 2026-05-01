import { z } from "zod";
import {
  CLAIM_SOURCES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  DUNNING_DOCUMENT_TYPES,
  DUNNING_LEVELS,
  DUNNING_STATUSES,
  DUNNING_TEMPLATE_TONES,
  GERMAN_FEDERAL_STATES,
  type ClaimSource,
  type ClaimStatus,
  type ClaimType,
  type DunningDocumentType,
  type DunningLevel,
  type DunningStatus,
  type DunningTemplateTone,
  type GermanFederalState,
} from "../types/dunning";

const dunningLevelValues = Object.values(DUNNING_LEVELS) as [
  DunningLevel,
  ...DunningLevel[],
];
const dunningDocumentTypeValues = Object.values(DUNNING_DOCUMENT_TYPES) as [
  DunningDocumentType,
  ...DunningDocumentType[],
];
const dunningStatusValues = Object.values(DUNNING_STATUSES) as [
  DunningStatus,
  ...DunningStatus[],
];
const dunningToneValues = Object.values(DUNNING_TEMPLATE_TONES) as [
  DunningTemplateTone,
  ...DunningTemplateTone[],
];
const claimTypeValues = Object.values(CLAIM_TYPES) as [
  ClaimType,
  ...ClaimType[],
];
const claimStatusValues = Object.values(CLAIM_STATUSES) as [
  ClaimStatus,
  ...ClaimStatus[],
];
const claimSourceValues = Object.values(CLAIM_SOURCES) as [
  ClaimSource,
  ...ClaimSource[],
];
const federalStateValues = Object.values(GERMAN_FEDERAL_STATES) as [
  GermanFederalState,
  ...GermanFederalState[],
];

export const createDunningInput = z.object({
  tenantId: z.string().uuid(),
  level: z.enum(dunningLevelValues),
  amount: z.number().int().positive(),
  dunningDate: z.string(),
});

export type CreateDunningInput = z.infer<typeof createDunningInput>;

export const createClaimInput = z.object({
  tenantId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
  rentalUnitId: z.string().uuid().nullable().optional(),
  type: z.enum(claimTypeValues),
  description: z.string().min(1).max(500),
  amount: z.number().int().positive(),
  remainingAmount: z.number().int().nonnegative().optional(),
  dueDate: z.string(),
  status: z.enum(claimStatusValues).default(CLAIM_STATUSES.open),
  source: z.enum(claimSourceValues).default(CLAIM_SOURCES.manual),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const updateClaimInput = createClaimInput
  .omit({ tenantId: true, propertyId: true, rentalUnitId: true, source: true })
  .partial()
  .extend({ id: z.string().uuid() });

export const listClaimsInput = z.object({
  tenantId: z.string().uuid(),
  status: z.enum(claimStatusValues).optional(),
});

export const createDunningDraftInput = z.object({
  tenantId: z.string().uuid(),
  documentType: z
    .enum(dunningDocumentTypeValues)
    .default(DUNNING_DOCUMENT_TYPES.rent),
  level: z.enum(dunningLevelValues).nullable().optional(),
  amount: z.number().int().positive(),
  feeAmount: z.number().int().nonnegative().default(0),
  dunningDate: z.string(),
  paymentDeadline: z.string().nullable().optional(),
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(10000).optional(),
  claimIds: z.array(z.string().uuid()).default([]),
});

export const updateDunningDraftInput = createDunningDraftInput
  .omit({ tenantId: true, claimIds: true })
  .partial()
  .extend({ id: z.string().uuid() });

export const listDunningInput = z.object({
  tenantId: z.string().uuid().optional(),
  documentType: z.enum(dunningDocumentTypeValues).optional(),
  status: z.enum(dunningStatusValues).optional(),
});

export const dunningIdInput = z.object({ id: z.string().uuid() });

export const archiveDunningPdfInput = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
});

export const updateDunningSettingsInput = z.object({
  defaultFederalState: z.enum(federalStateValues),
  latePaymentThresholdCount: z.number().int().min(1).max(12),
  latePaymentWindowMonths: z.number().int().min(1).max(60),
  automationEnabled: z.boolean().default(false),
});

export const upsertDunningLevelConfigInput = z.object({
  documentType: z.enum(dunningDocumentTypeValues),
  level: z.enum(dunningLevelValues),
  enabled: z.boolean(),
  daysAfterDue: z.number().int().min(0).max(365),
  feeAmount: z.number().int().nonnegative(),
  tone: z.enum(dunningToneValues),
});

export const upsertDunningTemplateInput = z.object({
  documentType: z.enum(dunningDocumentTypeValues),
  level: z.enum(dunningLevelValues).nullable().optional(),
  locale: z.enum(["de", "en"]),
  subjectTemplate: z.string().min(1).max(300),
  bodyTemplate: z.string().min(1).max(10000),
  tone: z.enum(dunningToneValues),
});

export type CreateClaimInput = z.infer<typeof createClaimInput>;
export type UpdateClaimInput = z.infer<typeof updateClaimInput>;
export type ListClaimsInput = z.infer<typeof listClaimsInput>;
export type CreateDunningDraftInput = z.infer<typeof createDunningDraftInput>;
export type UpdateDunningDraftInput = z.infer<typeof updateDunningDraftInput>;
export type ListDunningInput = z.infer<typeof listDunningInput>;
export type UpdateDunningSettingsInput = z.infer<
  typeof updateDunningSettingsInput
>;
export type UpsertDunningLevelConfigInput = z.infer<
  typeof upsertDunningLevelConfigInput
>;
export type UpsertDunningTemplateInput = z.infer<
  typeof upsertDunningTemplateInput
>;
