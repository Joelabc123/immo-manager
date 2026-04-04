import { z } from "zod";

export const createRentalUnitInput = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  floor: z.string().max(50).optional(),
  areaSqm: z.number().int().positive().optional(),
});

export const updateRentalUnitInput = createRentalUnitInput
  .partial()
  .omit({ propertyId: true });

export type CreateRentalUnitInput = z.infer<typeof createRentalUnitInput>;
export type UpdateRentalUnitInput = z.infer<typeof updateRentalUnitInput>;
