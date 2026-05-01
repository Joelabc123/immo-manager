import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { rentalUnits, properties, tenants } from "@repo/shared/db/schema";
import {
  createRentalUnitInput,
  updateRentalUnitInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

const UNIT_TRACKED_FIELDS = ["name", "floor", "areaSqm"] as const;

async function verifyPropertyOwnership(
  propertyId: string,
  userId: string,
): Promise<void> {
  const [property] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)))
    .limit(1);

  if (!property) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Property not found",
    });
  }
}

export const rentalUnitsRouter = router({
  create: protectedProcedure
    .input(createRentalUnitInput)
    .mutation(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const [unit] = await db.insert(rentalUnits).values(input).returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.rental_unit,
        entityId: unit.id,
        action: "create",
      });

      return unit;
    }),

  list: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const units = await db
        .select()
        .from(rentalUnits)
        .where(eq(rentalUnits.propertyId, input.propertyId));

      // Fetch assigned tenants for each unit
      const unitIds = units.map((u) => u.id);
      const activeTenants =
        unitIds.length > 0
          ? await db
              .select({
                rentalUnitId: tenants.rentalUnitId,
                tenantId: tenants.id,
                firstName: tenants.firstName,
                lastName: tenants.lastName,
                coldRent: tenants.coldRent,
                warmRent: tenants.warmRent,
                rentEnd: tenants.rentEnd,
              })
              .from(tenants)
              .where(
                and(
                  eq(tenants.userId, ctx.user.id),
                  inArray(tenants.rentalUnitId, unitIds),
                ),
              )
          : [];

      // Map tenants to their units
      const tenantsByUnit = new Map<
        string,
        Array<(typeof activeTenants)[number]>
      >();
      for (const t of activeTenants) {
        if (t.rentalUnitId) {
          const existing = tenantsByUnit.get(t.rentalUnitId) ?? [];
          existing.push(t);
          tenantsByUnit.set(t.rentalUnitId, existing);
        }
      }

      return units.map((unit) => ({
        ...unit,
        tenants: tenantsByUnit.get(unit.id) ?? [],
      }));
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateRentalUnitInput }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via property
      const [unit] = await db
        .select()
        .from(rentalUnits)
        .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
        .where(
          and(eq(rentalUnits.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rental unit not found",
        });
      }

      const [updated] = await db
        .update(rentalUnits)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(rentalUnits.id, input.id))
        .returning();

      const changes = diffChanges(unit.rental_units, input.data, [
        ...UNIT_TRACKED_FIELDS,
      ]);
      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.rental_unit,
          entityId: input.id,
          action: "update",
          changes,
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [unit] = await db
        .select({ unitId: rentalUnits.id })
        .from(rentalUnits)
        .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
        .where(
          and(eq(rentalUnits.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rental unit not found",
        });
      }

      await db.delete(rentalUnits).where(eq(rentalUnits.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.rental_unit,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getDependencies: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [unit] = await db
        .select({ unitId: rentalUnits.id })
        .from(rentalUnits)
        .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
        .where(
          and(eq(rentalUnits.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rental unit not found",
        });
      }

      const [tenantCount] = await db
        .select({ count: count() })
        .from(tenants)
        .where(eq(tenants.rentalUnitId, input.id));

      return { tenants: tenantCount.count };
    }),
});
