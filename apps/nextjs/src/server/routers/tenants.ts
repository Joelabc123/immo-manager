import { TRPCError } from "@trpc/server";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  asc,
  isNull,
  lt,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import {
  tenants,
  tenantEmails,
  rentalUnits,
  properties,
  rentPayments,
  rentAdjustments,
  dunningRecords,
} from "@repo/shared/db/schema";
import { createTenantInput, updateTenantInput } from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

const TENANT_TRACKED_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "gender",
  "previousAddress",
  "iban",
  "depositPaid",
  "rentStart",
  "rentEnd",
  "noticePeriodMonths",
  "coldRent",
  "warmRent",
  "rentalUnitId",
] as const;

export const tenantsRouter = router({
  create: protectedProcedure
    .input(createTenantInput)
    .mutation(async ({ ctx, input }) => {
      const { emails, ...tenantData } = input;

      // If rentalUnitId provided, verify ownership via property
      if (tenantData.rentalUnitId) {
        const [unit] = await db
          .select({ unitId: rentalUnits.id })
          .from(rentalUnits)
          .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
          .where(
            and(
              eq(rentalUnits.id, tenantData.rentalUnitId),
              eq(properties.userId, ctx.user.id),
            ),
          )
          .limit(1);

        if (!unit) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Rental unit not found",
          });
        }
      }

      // Transaction: insert tenant + emails
      const [tenant] = await db
        .insert(tenants)
        .values({
          userId: ctx.user.id,
          ...tenantData,
        })
        .returning();

      if (emails.length > 0) {
        await db.insert(tenantEmails).values(
          emails.map((e) => ({
            tenantId: tenant.id,
            email: e.email,
            isPrimary: e.isPrimary,
          })),
        );
      }

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.tenant,
        entityId: tenant.id,
        action: "create",
      });

      return tenant;
    }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        propertyId: z.string().uuid().optional(),
        status: z.enum(["active", "former"]).optional(),
        sortBy: z.enum(["name", "rentStart", "coldRent"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, propertyId, status, sortBy, sortOrder, page, pageSize } =
        input;
      const offset = (page - 1) * pageSize;
      const today = new Date().toISOString().split("T")[0];

      const conditions = [eq(tenants.userId, ctx.user.id)];

      if (search) {
        conditions.push(
          or(
            ilike(tenants.firstName, `%${search}%`),
            ilike(tenants.lastName, `%${search}%`),
          )!,
        );
      }

      if (propertyId) {
        // Filter by property: get rental unit IDs for this property
        const unitIds = db
          .select({ id: rentalUnits.id })
          .from(rentalUnits)
          .where(eq(rentalUnits.propertyId, propertyId));
        conditions.push(sql`${tenants.rentalUnitId} IN (${unitIds})`);
      }

      if (status === "active") {
        conditions.push(
          or(isNull(tenants.rentEnd), sql`${tenants.rentEnd} >= ${today}`)!,
        );
      } else if (status === "former") {
        conditions.push(sql`${tenants.rentEnd} < ${today}`);
      }

      const whereClause = and(...conditions);

      const sortColumn = {
        name: tenants.lastName,
        rentStart: tenants.rentStart,
        coldRent: tenants.coldRent,
      }[sortBy];
      const orderFn = sortOrder === "asc" ? asc : desc;

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(tenants)
          .where(whereClause)
          .orderBy(orderFn(sortColumn))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(tenants).where(whereClause),
      ]);

      // Fetch emails and rental unit/property info for listed tenants
      const tenantIds = items.map((t) => t.id);

      const [emailRows, unitPropertyRows] = await Promise.all([
        tenantIds.length > 0
          ? db
              .select()
              .from(tenantEmails)
              .where(
                sql`${tenantEmails.tenantId} IN (${sql.join(
                  tenantIds.map((id) => sql`${id}`),
                  sql`, `,
                )})`,
              )
          : Promise.resolve([]),
        // Fetch property info for tenants that have a rental unit
        tenantIds.length > 0
          ? db
              .select({
                unitId: rentalUnits.id,
                unitName: rentalUnits.name,
                propertyId: properties.id,
                propertyStreet: properties.street,
                propertyCity: properties.city,
              })
              .from(rentalUnits)
              .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
              .where(eq(properties.userId, ctx.user.id))
          : Promise.resolve([]),
      ]);

      const emailsByTenant = new Map<
        string,
        Array<{ id: string; email: string; isPrimary: boolean }>
      >();
      for (const row of emailRows) {
        const existing = emailsByTenant.get(row.tenantId) ?? [];
        existing.push({
          id: row.id,
          email: row.email,
          isPrimary: row.isPrimary,
        });
        emailsByTenant.set(row.tenantId, existing);
      }

      const unitPropertyMap = new Map<
        string,
        {
          unitName: string;
          propertyId: string;
          propertyStreet: string | null;
          propertyCity: string | null;
        }
      >();
      for (const row of unitPropertyRows) {
        unitPropertyMap.set(row.unitId, {
          unitName: row.unitName,
          propertyId: row.propertyId,
          propertyStreet: row.propertyStreet,
          propertyCity: row.propertyCity,
        });
      }

      return {
        items: items.map((item) => ({
          ...item,
          emails: emailsByTenant.get(item.id) ?? [],
          unitInfo: item.rentalUnitId
            ? (unitPropertyMap.get(item.rentalUnitId) ?? null)
            : null,
        })),
        total: totalResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.count / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(and(eq(tenants.id, input.id), eq(tenants.userId, ctx.user.id)))
        .limit(1);

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const [emails, adjustments, unitInfo] = await Promise.all([
        db
          .select()
          .from(tenantEmails)
          .where(eq(tenantEmails.tenantId, tenant.id)),
        db
          .select()
          .from(rentAdjustments)
          .where(eq(rentAdjustments.tenantId, tenant.id))
          .orderBy(desc(rentAdjustments.effectiveDate)),
        tenant.rentalUnitId
          ? db
              .select({
                unitId: rentalUnits.id,
                unitName: rentalUnits.name,
                unitFloor: rentalUnits.floor,
                propertyId: properties.id,
                propertyStreet: properties.street,
                propertyCity: properties.city,
                propertyZipCode: properties.zipCode,
                propertyType: properties.type,
              })
              .from(rentalUnits)
              .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
              .where(eq(rentalUnits.id, tenant.rentalUnitId))
              .limit(1)
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
      ]);

      return {
        ...tenant,
        emails,
        rentAdjustments: adjustments,
        unitInfo,
      };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateTenantInput }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(tenants)
        .where(and(eq(tenants.id, input.id), eq(tenants.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const { emails, ...tenantData } = input.data;

      const [updated] = await db
        .update(tenants)
        .set({ ...tenantData, updatedAt: new Date() })
        .where(eq(tenants.id, input.id))
        .returning();

      // Sync emails if provided
      if (emails !== undefined) {
        await db
          .delete(tenantEmails)
          .where(eq(tenantEmails.tenantId, input.id));

        if (emails.length > 0) {
          await db.insert(tenantEmails).values(
            emails.map((e) => ({
              tenantId: input.id,
              email: e.email,
              isPrimary: e.isPrimary,
            })),
          );
        }
      }

      const changes = diffChanges(existing, tenantData, [
        ...TENANT_TRACKED_FIELDS,
      ]);
      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.tenant,
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
      const [existing] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.id, input.id), eq(tenants.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      // Cascading delete handles rent_payments, dunning_records, tenant_emails, rent_adjustments
      await db.delete(tenants).where(eq(tenants.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.tenant,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getDependencies: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.id, input.id), eq(tenants.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const [[paymentCount], [dunningCount]] = await Promise.all([
        db
          .select({ count: count() })
          .from(rentPayments)
          .where(eq(rentPayments.tenantId, input.id)),
        db
          .select({ count: count() })
          .from(dunningRecords)
          .where(eq(dunningRecords.tenantId, input.id)),
      ]);

      return {
        rentPayments: paymentCount.count,
        dunningRecords: dunningCount.count,
      };
    }),

  getHistory: protectedProcedure
    .input(z.object({ rentalUnitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0];

      return db
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.userId, ctx.user.id),
            eq(tenants.rentalUnitId, input.rentalUnitId),
            lt(tenants.rentEnd, today),
          ),
        )
        .orderBy(desc(tenants.rentEnd));
    }),
});
