import { z } from "zod";
import { RENT_TYPES, GENDERS } from "../types/tenant";

const rentTypeValues = Object.values(RENT_TYPES) as [string, ...string[]];
const genderValues = Object.values(GENDERS) as [string, ...string[]];

export const createTenantInput = z.object({
  rentalUnitId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  emails: z.array(
    z.object({
      email: z.string().email(),
      isPrimary: z.boolean().default(false),
    }),
  ),
  phone: z.string().max(50).optional(),
  gender: z.enum(genderValues).optional(),
  iban: z.string().max(34).optional(),
  previousAddress: z.string().max(500).optional(),
  depositPaid: z.boolean().default(false),
  rentStart: z.string(),
  rentEnd: z.string().optional(),
  coldRent: z.number().int().positive(),
  warmRent: z.number().int().positive(),
  noticePeriodMonths: z.number().int().positive().optional(),
  rentType: z.enum(rentTypeValues).optional(),
});

export const updateTenantInput = createTenantInput.partial();

export type CreateTenantInput = z.infer<typeof createTenantInput>;
export type UpdateTenantInput = z.infer<typeof updateTenantInput>;
