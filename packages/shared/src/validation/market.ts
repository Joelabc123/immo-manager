import { z } from "zod";

export const createRentBenchmarkInput = z.object({
  region: z.string().min(1).max(255),
  rentPerSqmCents: z.number().int().positive(),
  validFrom: z.string().min(1),
  source: z.string().max(500).optional(),
});

export type CreateRentBenchmarkInput = z.infer<typeof createRentBenchmarkInput>;

export const updateRentBenchmarkInput = z.object({
  id: z.string().uuid(),
  region: z.string().min(1).max(255).optional(),
  rentPerSqmCents: z.number().int().positive().optional(),
  validFrom: z.string().min(1).optional(),
  source: z.string().max(500).optional(),
});

export type UpdateRentBenchmarkInput = z.infer<typeof updateRentBenchmarkInput>;

export const listRentBenchmarksInput = z.object({
  region: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(25),
});

export type ListRentBenchmarksInput = z.infer<typeof listRentBenchmarksInput>;

export const getInterestRateHistoryInput = z.object({
  months: z.number().int().positive().max(120).default(24),
});

export type GetInterestRateHistoryInput = z.infer<
  typeof getInterestRateHistoryInput
>;
