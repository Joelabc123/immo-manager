import { z } from "zod";

export const createRentAdjustmentInput = z.object({
  tenantId: z.string().uuid(),
  newColdRent: z.number().int().positive(),
  effectiveDate: z.string(),
  reason: z.string().max(1000).optional(),
});

export type CreateRentAdjustmentInput = z.infer<
  typeof createRentAdjustmentInput
>;
