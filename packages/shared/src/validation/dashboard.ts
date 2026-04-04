import { z } from "zod";
import { SCENARIO_MODULES } from "../types/common";

const moduleValues = Object.values(SCENARIO_MODULES) as [string, ...string[]];

export const wealthForecastInput = z.object({
  growthRate: z.number().int().min(0).max(2000).default(200),
  inflationRate: z.number().int().min(0).max(1000).default(200),
  rentGrowthRate: z.number().int().min(0).max(1000).default(150),
  timeHorizonYears: z.number().int().min(1).max(50).default(10),
});

export const dismissActionItemInput = z.object({
  ruleType: z.string().min(1),
  entityId: z.string().uuid(),
});

export const saveScenarioInput = z.object({
  name: z.string().min(1).max(255),
  module: z.enum(moduleValues),
  settings: z.record(z.string(), z.unknown()),
});

export const updateScenarioInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type WealthForecastInput = z.infer<typeof wealthForecastInput>;
export type DismissActionItemInput = z.infer<typeof dismissActionItemInput>;
export type SaveScenarioInput = z.infer<typeof saveScenarioInput>;
export type UpdateScenarioInput = z.infer<typeof updateScenarioInput>;
