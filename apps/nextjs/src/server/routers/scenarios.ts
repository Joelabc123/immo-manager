import { TRPCError } from "@trpc/server";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { scenarios } from "@repo/shared/db/schema";
import {
  saveScenarioInput,
  updateScenarioInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";

export const scenariosRouter = router({
  list: protectedProcedure
    .input(z.object({ module: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(scenarios.userId, ctx.user.id)];
      if (input.module) {
        conditions.push(eq(scenarios.module, input.module));
      }

      return db
        .select()
        .from(scenarios)
        .where(and(...conditions))
        .orderBy(desc(scenarios.updatedAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [scenario] = await db
        .select()
        .from(scenarios)
        .where(
          and(eq(scenarios.id, input.id), eq(scenarios.userId, ctx.user.id)),
        )
        .limit(1);

      if (!scenario) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scenario not found",
        });
      }

      return scenario;
    }),

  create: protectedProcedure
    .input(saveScenarioInput)
    .mutation(async ({ ctx, input }) => {
      const [scenario] = await db
        .insert(scenarios)
        .values({
          userId: ctx.user.id,
          name: input.name,
          module: input.module,
          settings: input.settings,
        })
        .returning();

      return scenario;
    }),

  update: protectedProcedure
    .input(updateScenarioInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: scenarios.id })
        .from(scenarios)
        .where(
          and(eq(scenarios.id, input.id), eq(scenarios.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scenario not found",
        });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.settings !== undefined) updateData.settings = input.settings;

      const [updated] = await db
        .update(scenarios)
        .set(updateData)
        .where(eq(scenarios.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: scenarios.id })
        .from(scenarios)
        .where(
          and(eq(scenarios.id, input.id), eq(scenarios.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scenario not found",
        });
      }

      await db.delete(scenarios).where(eq(scenarios.id, input.id));

      return { success: true };
    }),
});
