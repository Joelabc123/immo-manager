import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import {
  rentPayments,
  tenants,
  rentalUnits,
} from "@repo/shared/db/schema";
import { PAYMENT_STATUS } from "@repo/shared/types";
import {
  recordRentPaymentInput,
  generateRentPaymentsInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

export const rentPaymentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid().optional(),
        propertyId: z.string().uuid().optional(),
        status: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tenantId, propertyId, status, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      if (tenantId) {
        // Verify tenant ownership
        const [tenant] = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(and(eq(tenants.id, tenantId), eq(tenants.userId, ctx.user.id)))
          .limit(1);

        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tenant not found",
          });
        }
      }

      const conditions = [
        // Only payments for tenants owned by this user
        sql`${rentPayments.tenantId} IN (
          SELECT ${tenants.id} FROM ${tenants}
          WHERE ${tenants.userId} = ${ctx.user.id}
        )`,
      ];

      if (tenantId) {
        conditions.push(eq(rentPayments.tenantId, tenantId));
      }

      if (propertyId) {
        conditions.push(
          sql`${rentPayments.rentalUnitId} IN (
            SELECT ${rentalUnits.id} FROM ${rentalUnits}
            WHERE ${rentalUnits.propertyId} = ${propertyId}
          )`,
        );
      }

      if (status) {
        conditions.push(eq(rentPayments.status, status));
      }

      const whereClause = and(...conditions);

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(rentPayments)
          .where(whereClause)
          .orderBy(desc(rentPayments.dueDate))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(rentPayments).where(whereClause),
      ]);

      return {
        items,
        total: totalResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.count / pageSize),
      };
    }),

  record: protectedProcedure
    .input(recordRentPaymentInput)
    .mutation(async ({ ctx, input }) => {
      // Verify payment belongs to user's tenant
      const [payment] = await db
        .select({
          paymentId: rentPayments.id,
          tenantUserId: tenants.userId,
        })
        .from(rentPayments)
        .innerJoin(tenants, eq(rentPayments.tenantId, tenants.id))
        .where(eq(rentPayments.id, input.id))
        .limit(1);

      if (!payment || payment.tenantUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      const [updated] = await db
        .update(rentPayments)
        .set({
          paidAmount: input.paidAmount,
          paidDate: input.paidDate,
          status: input.status,
        })
        .where(eq(rentPayments.id, input.id))
        .returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.rent_payment,
        entityId: input.id,
        action: "update",
        changes: [
          { field: "status", oldValue: null, newValue: input.status },
          {
            field: "paidAmount",
            oldValue: null,
            newValue: String(input.paidAmount),
          },
        ],
      });

      return updated;
    }),

  generateMonthly: protectedProcedure
    .input(generateRentPaymentsInput)
    .mutation(async ({ ctx, input }) => {
      const { month, year } = input;
      const dueDate = `${year}-${String(month).padStart(2, "0")}-01`;

      // Get all active tenants for this user
      const activeTenants = await db
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.userId, ctx.user.id),
            sql`${tenants.rentStart} <= ${dueDate}`,
            sql`(${tenants.rentEnd} IS NULL OR ${tenants.rentEnd} >= ${dueDate})`,
          ),
        );

      if (activeTenants.length === 0) {
        return { generated: 0 };
      }

      // Check which tenants already have payments for this month
      const existingPayments = await db
        .select({ tenantId: rentPayments.tenantId })
        .from(rentPayments)
        .where(eq(rentPayments.dueDate, dueDate));

      const existingTenantIds = new Set(
        existingPayments.map((p) => p.tenantId),
      );

      const newPayments = activeTenants
        .filter((t) => !existingTenantIds.has(t.id))
        .map((t) => ({
          tenantId: t.id,
          rentalUnitId: t.rentalUnitId,
          expectedAmount: t.warmRent,
          dueDate,
          status: PAYMENT_STATUS.pending,
        }));

      if (newPayments.length > 0) {
        await db.insert(rentPayments).values(newPayments);
      }

      return { generated: newPayments.length };
    }),

  getOverdue: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    return db
      .select({
        payment: rentPayments,
        tenantFirstName: tenants.firstName,
        tenantLastName: tenants.lastName,
      })
      .from(rentPayments)
      .innerJoin(tenants, eq(rentPayments.tenantId, tenants.id))
      .where(
        and(
          eq(tenants.userId, ctx.user.id),
          eq(rentPayments.status, PAYMENT_STATUS.pending),
          sql`${rentPayments.dueDate} < ${today}`,
        ),
      )
      .orderBy(desc(rentPayments.dueDate));
  }),

  getSummary: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid().optional(),
        propertyId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        sql`${rentPayments.tenantId} IN (
          SELECT ${tenants.id} FROM ${tenants}
          WHERE ${tenants.userId} = ${ctx.user.id}
        )`,
      ];

      if (input.tenantId) {
        conditions.push(eq(rentPayments.tenantId, input.tenantId));
      }

      if (input.propertyId) {
        conditions.push(
          sql`${rentPayments.rentalUnitId} IN (
            SELECT ${rentalUnits.id} FROM ${rentalUnits}
            WHERE ${rentalUnits.propertyId} = ${input.propertyId}
          )`,
        );
      }

      const whereClause = and(...conditions);

      const [result] = await db
        .select({
          totalExpected: sum(rentPayments.expectedAmount),
          totalPaid: sum(rentPayments.paidAmount),
          totalCount: count(),
        })
        .from(rentPayments)
        .where(whereClause);

      const [overdueResult] = await db
        .select({ count: count() })
        .from(rentPayments)
        .where(
          and(whereClause, eq(rentPayments.status, PAYMENT_STATUS.overdue)),
        );

      return {
        totalExpected: Number(result.totalExpected ?? 0),
        totalPaid: Number(result.totalPaid ?? 0),
        totalCount: result.totalCount,
        overdueCount: overdueResult.count,
      };
    }),
});
