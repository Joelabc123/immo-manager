import { z } from "zod";

export const createLoanInput = z.object({
  propertyId: z.string().uuid(),
  bankName: z.string().min(1).max(255),
  loanAmount: z.number().int().positive(),
  remainingBalance: z.number().int().nonnegative(),
  interestRate: z.number().int().nonnegative(),
  repaymentRate: z.number().int().nonnegative(),
  monthlyPayment: z.number().int().positive(),
  interestFixedUntil: z.string().optional(),
  loanStart: z.string(),
  loanTermMonths: z.number().int().positive().optional(),
  annualSpecialRepaymentLimit: z.number().int().nonnegative().optional(),
});

export const updateLoanInput = createLoanInput.partial().omit({
  propertyId: true,
});

export type CreateLoanInput = z.infer<typeof createLoanInput>;
export type UpdateLoanInput = z.infer<typeof updateLoanInput>;
