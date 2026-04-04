import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { marketDataCache } from "@repo/shared/db/schema";
import { MARKET_DATA_TYPES } from "@repo/shared/types";
import type { RentBenchmarkData } from "@repo/shared/types";
import {
  createRentBenchmarkInput,
  updateRentBenchmarkInput,
  listRentBenchmarksInput,
  getInterestRateHistoryInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";
import {
  syncEcbInterestRates,
  getLatestInterestRates,
  getInterestRateHistory,
} from "../services/market-data";

export const marketDataRouter = router({
  // ────────────────── Interest Rates ──────────────────

  getInterestRates: protectedProcedure.query(async () => {
    return getLatestInterestRates();
  }),

  getInterestRateHistory: protectedProcedure
    .input(getInterestRateHistoryInput)
    .query(async ({ input }) => {
      return getInterestRateHistory(input.months);
    }),

  syncInterestRates: protectedProcedure.mutation(async () => {
    const result = await syncEcbInterestRates();
    return result;
  }),

  // ────────────────── Rent Benchmarks ──────────────────

  listRentBenchmarks: protectedProcedure
    .input(listRentBenchmarksInput)
    .query(async ({ input }) => {
      const { region, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(marketDataCache.dataType, MARKET_DATA_TYPES.rent_benchmark),
      ];

      if (region) {
        conditions.push(ilike(marketDataCache.region, `%${region}%`));
      }

      const whereClause = and(...conditions);

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(marketDataCache)
          .where(whereClause)
          .orderBy(desc(marketDataCache.fetchedAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(marketDataCache).where(whereClause),
      ]);

      return {
        items: items.map((item) => ({
          id: item.id,
          region: item.region,
          data: item.data as RentBenchmarkData,
          fetchedAt: item.fetchedAt,
        })),
        total: totalResult.count,
        page,
        limit,
        totalPages: Math.ceil(totalResult.count / limit),
      };
    }),

  createRentBenchmark: protectedProcedure
    .input(createRentBenchmarkInput)
    .mutation(async ({ ctx, input }) => {
      const benchmarkData: RentBenchmarkData = {
        rentPerSqmCents: input.rentPerSqmCents,
        validFrom: input.validFrom,
        source: input.source ?? "",
      };

      const [row] = await db
        .insert(marketDataCache)
        .values({
          dataType: MARKET_DATA_TYPES.rent_benchmark,
          region: input.region,
          data: benchmarkData,
          fetchedAt: new Date(),
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: "rent_benchmark",
        entityId: row.id,
        action: "create",
        changes: [
          { field: "region", oldValue: null, newValue: input.region },
          {
            field: "rentPerSqmCents",
            oldValue: null,
            newValue: String(input.rentPerSqmCents),
          },
        ],
      });

      return {
        id: row.id,
        region: row.region,
        data: benchmarkData,
        fetchedAt: row.fetchedAt,
      };
    }),

  updateRentBenchmark: protectedProcedure
    .input(updateRentBenchmarkInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(marketDataCache)
        .where(
          and(
            eq(marketDataCache.id, input.id),
            eq(marketDataCache.dataType, MARKET_DATA_TYPES.rent_benchmark),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rent benchmark not found",
        });
      }

      const existingData = existing.data as RentBenchmarkData;
      const updatedData: RentBenchmarkData = {
        rentPerSqmCents: input.rentPerSqmCents ?? existingData.rentPerSqmCents,
        validFrom: input.validFrom ?? existingData.validFrom,
        source: input.source ?? existingData.source,
      };

      const [updated] = await db
        .update(marketDataCache)
        .set({
          region: input.region ?? existing.region,
          data: updatedData,
          fetchedAt: new Date(),
        })
        .where(eq(marketDataCache.id, input.id))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: "rent_benchmark",
        entityId: input.id,
        action: "update",
      });

      return {
        id: updated.id,
        region: updated.region,
        data: updatedData,
        fetchedAt: updated.fetchedAt,
      };
    }),

  deleteRentBenchmark: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: marketDataCache.id })
        .from(marketDataCache)
        .where(
          and(
            eq(marketDataCache.id, input.id),
            eq(marketDataCache.dataType, MARKET_DATA_TYPES.rent_benchmark),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rent benchmark not found",
        });
      }

      await db.delete(marketDataCache).where(eq(marketDataCache.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: "rent_benchmark",
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getRentBenchmarkForProperty: protectedProcedure
    .input(z.object({ city: z.string().min(1) }))
    .query(async ({ input }) => {
      const { getRentBenchmarkForCity } =
        await import("../services/market-data");
      const benchmark = await getRentBenchmarkForCity(input.city);
      return { rentPerSqmCents: benchmark };
    }),
});
