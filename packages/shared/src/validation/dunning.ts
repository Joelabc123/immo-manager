import { z } from "zod";
import { DUNNING_LEVELS } from "../types/dunning";

const dunningLevelValues = Object.values(DUNNING_LEVELS) as [
  string,
  ...string[],
];

export const createDunningInput = z.object({
  tenantId: z.string().uuid(),
  level: z.enum(dunningLevelValues),
  amount: z.number().int().positive(),
  dunningDate: z.string(),
});

export type CreateDunningInput = z.infer<typeof createDunningInput>;
