import { z } from "zod";
import { PROPERTY_TYPES, PROPERTY_STATUS } from "../types/property";

const propertyTypeValues = Object.values(PROPERTY_TYPES) as [
  string,
  ...string[],
];
const propertyStatusValues = Object.values(PROPERTY_STATUS) as [
  string,
  ...string[],
];

export const createPropertyInput = z.object({
  type: z.enum(propertyTypeValues),
  status: z.enum(propertyStatusValues),
  street: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(10).default("DE"),
  livingAreaSqm: z.number().int().positive(),
  landAreaSqm: z.number().int().positive().optional(),
  constructionYear: z.number().int().min(1800).max(2100).optional(),
  roomCount: z.number().int().positive().optional(),
  purchasePrice: z.number().int().positive(),
  purchaseDate: z.string(),
  marketValue: z.number().int().positive().optional(),
  unitCount: z.number().int().positive().default(1),
  notes: z.string().max(5000).optional(),
  depreciationBuildingCost: z.number().int().positive().optional(),
  depreciationRate: z.number().int().positive().optional(),
  depreciationStart: z.string().optional(),
  propertyTaxAnnual: z.number().int().nonnegative().optional(),
});

export const updatePropertyInput = createPropertyInput.partial();

export type CreatePropertyInput = z.infer<typeof createPropertyInput>;
export type UpdatePropertyInput = z.infer<typeof updatePropertyInput>;
