import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { dunningRecords, tenants } from "@repo/shared/db/schema";
import { createDunningInput } from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";

export const dunningRouter = router({
  create: protectedProcedure
    .input(createDunningInput)
    .mutation(async ({ ctx, input }) => {
      // Verify tenant ownership
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(eq(tenants.id, input.tenantId), eq(tenants.userId, ctx.user.id)),
        )
        .limit(1);

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const [record] = await db
        .insert(dunningRecords)
        .values(input)
        .returning();

      return record;
    }),

  list: protectedProcedure
    .input(createDunningInput.pick({ tenantId: true }))
    .query(async ({ ctx, input }) => {
      // Verify tenant ownership
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(
          and(eq(tenants.id, input.tenantId), eq(tenants.userId, ctx.user.id)),
        )
        .limit(1);

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      return db
        .select()
        .from(dunningRecords)
        .where(eq(dunningRecords.tenantId, input.tenantId))
        .orderBy(desc(dunningRecords.dunningDate));
    }),
});
