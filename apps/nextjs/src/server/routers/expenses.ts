import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { expenses, properties } from "@repo/shared/db/schema";
import {
  createExpenseInput,
  updateExpenseInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

const EXPENSE_TRACKED_FIELDS = [
  "category",
  "description",
  "amount",
  "date",
  "isApportionable",
  "isRecurring",
  "recurringInterval",
] as const;

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

export const expensesRouter = router({
  create: protectedProcedure
    .input(createExpenseInput)
    .mutation(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const [expense] = await db.insert(expenses).values(input).returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.expense,
        entityId: expense.id,
        action: "create",
      });

      return expense;
    }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        category: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { propertyId, category, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      await verifyPropertyOwnership(propertyId, ctx.user.id);

      const conditions = [eq(expenses.propertyId, propertyId)];

      if (category) {
        conditions.push(eq(expenses.category, category));
      }

      const whereClause = and(...conditions);

      const [items, [totalResult]] = await Promise.all([
        db
          .select()
          .from(expenses)
          .where(whereClause)
          .orderBy(desc(expenses.date))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(expenses).where(whereClause),
      ]);

      return {
        items,
        total: totalResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.count / pageSize),
      };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateExpenseInput }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(expenses)
        .innerJoin(properties, eq(expenses.propertyId, properties.id))
        .where(
          and(eq(expenses.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      const [updated] = await db
        .update(expenses)
        .set(input.data)
        .where(eq(expenses.id, input.id))
        .returning();

      const changes = diffChanges(existing.expenses, input.data, [
        ...EXPENSE_TRACKED_FIELDS,
      ]);
      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.expense,
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
        .select({ expenseId: expenses.id })
        .from(expenses)
        .innerJoin(properties, eq(expenses.propertyId, properties.id))
        .where(
          and(eq(expenses.id, input.id), eq(properties.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      await db.delete(expenses).where(eq(expenses.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.expense,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getSummary: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const [apportionable] = await db
        .select({
          total: sum(expenses.amount),
          count: count(),
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.propertyId, input.propertyId),
            eq(expenses.isApportionable, true),
          ),
        );

      const [nonApportionable] = await db
        .select({
          total: sum(expenses.amount),
          count: count(),
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.propertyId, input.propertyId),
            eq(expenses.isApportionable, false),
          ),
        );

      return {
        apportionable: {
          total: Number(apportionable.total ?? 0),
          count: apportionable.count,
        },
        nonApportionable: {
          total: Number(nonApportionable.total ?? 0),
          count: nonApportionable.count,
        },
      };
    }),
});
