export const AUDIT_ACTIONS = {
  create: "create",
  update: "update",
  delete: "delete",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const SCENARIO_MODULES = {
  stress_test: "stress_test",
  special_repayment: "special_repayment",
  exit_strategy: "exit_strategy",
  wealth_forecast: "wealth_forecast",
  refinancing: "refinancing",
} as const;

export type ScenarioModule =
  (typeof SCENARIO_MODULES)[keyof typeof SCENARIO_MODULES];

export const KPI_PERIODS = {
  current_month: "current_month",
  last_month: "last_month",
  last_3_months: "last_3_months",
  last_12_months: "last_12_months",
  current_year: "current_year",
} as const;

export type KpiPeriod = (typeof KPI_PERIODS)[keyof typeof KPI_PERIODS];

export const CURRENCIES = {
  EUR: "EUR",
  USD: "USD",
  CHF: "CHF",
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const LANGUAGES = {
  de: "de",
  en: "en",
} as const;

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export const ACTION_CENTER_RULE_TYPES = {
  vacancy: "vacancy",
  negative_cashflow: "negative_cashflow",
  overdue_rent: "overdue_rent",
  interest_binding_expiry: "interest_binding_expiry",
  contract_expiry: "contract_expiry",
  rent_potential: "rent_potential",
  special_repayment: "special_repayment",
} as const;

export type ActionCenterRuleType =
  (typeof ACTION_CENTER_RULE_TYPES)[keyof typeof ACTION_CENTER_RULE_TYPES];

export type ActionCenterSeverity = "risk" | "opportunity";
