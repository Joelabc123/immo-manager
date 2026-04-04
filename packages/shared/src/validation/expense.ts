import { z } from "zod";
import { EXPENSE_CATEGORIES, RECURRING_INTERVALS } from "../types/expense";

const categoryValues = Object.values(EXPENSE_CATEGORIES) as [
  string,
  ...string[],
];
const intervalValues = Object.values(RECURRING_INTERVALS) as [
  string,
  ...string[],
];

export const createExpenseInput = z.object({
  propertyId: z.string().uuid(),
  category: z.enum(categoryValues),
  description: z.string().max(1000).optional(),
  amount: z.number().int().positive(),
  date: z.string(),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(intervalValues).optional(),
  isApportionable: z.boolean().default(false),
});

export const updateExpenseInput = createExpenseInput.partial().omit({
  propertyId: true,
});

export type CreateExpenseInput = z.infer<typeof createExpenseInput>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInput>;
