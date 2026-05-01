export const DUNNING_LEVELS = {
  reminder: "reminder",
  first: "first",
  second: "second",
  third: "third",
} as const;

export type DunningLevel = (typeof DUNNING_LEVELS)[keyof typeof DUNNING_LEVELS];

export const REGULAR_DUNNING_LEVELS = {
  reminder: DUNNING_LEVELS.reminder,
  first: DUNNING_LEVELS.first,
  second: DUNNING_LEVELS.second,
} as const;

export type RegularDunningLevel =
  (typeof REGULAR_DUNNING_LEVELS)[keyof typeof REGULAR_DUNNING_LEVELS];

export const DUNNING_DOCUMENT_TYPES = {
  rent: "rent",
  utilities: "utilities",
  deposit: "deposit",
  late_payment_warning: "late_payment_warning",
  termination_warning: "termination_warning",
} as const;

export type DunningDocumentType =
  (typeof DUNNING_DOCUMENT_TYPES)[keyof typeof DUNNING_DOCUMENT_TYPES];

export const DUNNING_STATUSES = {
  draft: "draft",
  created: "created",
  archived: "archived",
  cancelled: "cancelled",
  resolved: "resolved",
} as const;

export type DunningStatus =
  (typeof DUNNING_STATUSES)[keyof typeof DUNNING_STATUSES];

export const DUNNING_TEMPLATE_TONES = {
  friendly: "friendly",
  formal: "formal",
  strict: "strict",
} as const;

export type DunningTemplateTone =
  (typeof DUNNING_TEMPLATE_TONES)[keyof typeof DUNNING_TEMPLATE_TONES];

export const CLAIM_TYPES = {
  cold_rent: "cold_rent",
  operating_cost_advance: "operating_cost_advance",
  utility_backpayment: "utility_backpayment",
  deposit_installment: "deposit_installment",
  dunning_fee: "dunning_fee",
  default_interest: "default_interest",
} as const;

export type ClaimType = (typeof CLAIM_TYPES)[keyof typeof CLAIM_TYPES];

export const CLAIM_STATUSES = {
  open: "open",
  partial: "partial",
  paid: "paid",
  cancelled: "cancelled",
} as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[keyof typeof CLAIM_STATUSES];

export const CLAIM_SOURCES = {
  manual: "manual",
  rent_payment: "rent_payment",
  system_suggestion: "system_suggestion",
} as const;

export type ClaimSource = (typeof CLAIM_SOURCES)[keyof typeof CLAIM_SOURCES];

export const GERMAN_FEDERAL_STATES = {
  BW: "BW",
  BY: "BY",
  BE: "BE",
  BB: "BB",
  HB: "HB",
  HH: "HH",
  HE: "HE",
  MV: "MV",
  NI: "NI",
  NW: "NW",
  RP: "RP",
  SL: "SL",
  SN: "SN",
  ST: "ST",
  SH: "SH",
  TH: "TH",
} as const;

export type GermanFederalState =
  (typeof GERMAN_FEDERAL_STATES)[keyof typeof GERMAN_FEDERAL_STATES];
