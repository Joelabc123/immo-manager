import { z } from "zod";
import { PAYMENT_STATUS } from "../types/payment";

const paymentStatusValues = Object.values(PAYMENT_STATUS) as [
  string,
  ...string[],
];

export const recordRentPaymentInput = z.object({
  id: z.string().uuid(),
  paidAmount: z.number().int().nonnegative(),
  paidDate: z.string(),
  status: z.enum(paymentStatusValues),
});

export const generateRentPaymentsInput = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type RecordRentPaymentInput = z.infer<typeof recordRentPaymentInput>;
export type GenerateRentPaymentsInput = z.infer<
  typeof generateRentPaymentsInput
>;
