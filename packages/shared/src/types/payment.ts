export const PAYMENT_STATUS = {
  pending: "pending",
  paid: "paid",
  overdue: "overdue",
  partial: "partial",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
