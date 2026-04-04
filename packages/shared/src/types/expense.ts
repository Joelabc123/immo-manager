export const EXPENSE_CATEGORIES = {
  heating: "heating",
  water: "water",
  waste: "waste",
  electricity: "electricity",
  insurance: "insurance",
  janitor: "janitor",
  property_tax_levy: "property_tax_levy",
  other: "other",
} as const;

export type ExpenseCategory =
  (typeof EXPENSE_CATEGORIES)[keyof typeof EXPENSE_CATEGORIES];

export const RECURRING_INTERVALS = {
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
} as const;

export type RecurringInterval =
  (typeof RECURRING_INTERVALS)[keyof typeof RECURRING_INTERVALS];
