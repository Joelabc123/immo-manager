import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { rentAdjustments, tenants } from "@repo/shared/db/schema";
import { createRentAdjustmentInput } from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

export const rentAdjustmentsRouter = router({
  create: protectedProcedure
    .input(createRentAdjustmentInput)
    .mutation(async ({ ctx, input }) => {
      // Verify tenant ownership and get current cold rent
      const [tenant] = await db
        .select({ id: tenants.id, coldRent: tenants.coldRent })
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

      // Create adjustment record with old rent
      const [adjustment] = await db
        .insert(rentAdjustments)
        .values({
          tenantId: input.tenantId,
          oldColdRent: tenant.coldRent,
          newColdRent: input.newColdRent,
          effectiveDate: input.effectiveDate,
          reason: input.reason,
        })
        .returning();

      // Update tenant's cold rent
      await db
        .update(tenants)
        .set({
          coldRent: input.newColdRent,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, input.tenantId));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.rent_adjustment,
        entityId: adjustment.id,
        action: "create",
        changes: [
          {
            field: "oldColdRent",
            oldValue: String(tenant.coldRent),
            newValue: String(input.newColdRent),
          },
        ],
      });

      return adjustment;
    }),

  list: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
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
        .from(rentAdjustments)
        .where(eq(rentAdjustments.tenantId, input.tenantId))
        .orderBy(desc(rentAdjustments.effectiveDate));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via tenant
      const [adjustment] = await db
        .select({
          adjustmentId: rentAdjustments.id,
          tenantUserId: tenants.userId,
        })
        .from(rentAdjustments)
        .innerJoin(tenants, eq(rentAdjustments.tenantId, tenants.id))
        .where(eq(rentAdjustments.id, input.id))
        .limit(1);

      if (!adjustment || adjustment.tenantUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rent adjustment not found",
        });
      }

      await db.delete(rentAdjustments).where(eq(rentAdjustments.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.rent_adjustment,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),
});
