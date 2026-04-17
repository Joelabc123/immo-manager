import { z } from "zod";
import { WIDGET_TYPES, WIDGET_SIZE_VARIANTS } from "../types/dashboard";

const widgetTypeSchema = z.enum(
  Object.values(WIDGET_TYPES) as [string, ...string[]],
);

const widgetSizeVariantSchema = z.enum(
  Object.keys(WIDGET_SIZE_VARIANTS) as [string, ...string[]],
);

const widgetPositionSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
});

const widgetSizeSchema = z.object({
  cols: z.number().int().min(1).max(12),
  rows: z.number().int().min(1).max(12),
});

const widgetInstanceSchema = z.object({
  id: z.string().min(1).max(64),
  type: widgetTypeSchema,
  variant: widgetSizeVariantSchema,
  position: widgetPositionSchema,
  size: widgetSizeSchema,
  config: z.record(z.string(), z.unknown()).optional(),
});

const dashboardLayoutSchema = z.object({
  widgets: z.array(widgetInstanceSchema).max(60),
  version: z.number().int().min(1),
});

const presetNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(60, "Name must be at most 60 characters");

export const createPresetInput = z.object({
  name: presetNameSchema,
  layout: dashboardLayoutSchema,
  isDefault: z.boolean().optional(),
});

export const updatePresetInput = z.object({
  id: z.string().uuid(),
  layout: dashboardLayoutSchema,
});

export const renamePresetInput = z.object({
  id: z.string().uuid(),
  name: presetNameSchema,
});

export const presetIdInput = z.object({
  id: z.string().uuid(),
});

export const duplicatePresetInput = z.object({
  id: z.string().uuid(),
  name: presetNameSchema,
});

export type CreatePresetInput = z.infer<typeof createPresetInput>;
export type UpdatePresetInput = z.infer<typeof updatePresetInput>;
export type RenamePresetInput = z.infer<typeof renamePresetInput>;
export type PresetIdInput = z.infer<typeof presetIdInput>;
export type DuplicatePresetInput = z.infer<typeof duplicatePresetInput>;

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
