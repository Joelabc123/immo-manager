import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@repo/shared/db";
import { loans, properties } from "@repo/shared/db/schema";
import { createLoanInput, updateLoanInput } from "@repo/shared/validation";
import {
  calculateAmortizationSchedule,
  aggregateYearlySummary,
} from "@repo/shared/calculations";

import { router, protectedProcedure } from "../trpc";
import { logAudit, diffChanges } from "../services/audit";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";

const LOAN_TRACKED_FIELDS = [
  "bankName",
  "loanAmount",
  "remainingBalance",
  "interestRate",
  "repaymentRate",
  "monthlyPayment",
  "interestFixedUntil",
  "loanStart",
  "loanTermMonths",
  "annualSpecialRepaymentLimit",
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

export const loansRouter = router({
  create: protectedProcedure
    .input(createLoanInput)
    .mutation(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      const [loan] = await db.insert(loans).values(input).returning();

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.loan,
        entityId: loan.id,
        action: "create",
      });

      return loan;
    }),

  list: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyPropertyOwnership(input.propertyId, ctx.user.id);

      return db
        .select()
        .from(loans)
        .where(eq(loans.propertyId, input.propertyId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [loan] = await db
        .select()
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(and(eq(loans.id, input.id), eq(properties.userId, ctx.user.id)))
        .limit(1);

      if (!loan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Loan not found",
        });
      }

      return loan.loans;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateLoanInput }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(and(eq(loans.id, input.id), eq(properties.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Loan not found",
        });
      }

      const [updated] = await db
        .update(loans)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(loans.id, input.id))
        .returning();

      const changes = diffChanges(existing.loans, input.data, [
        ...LOAN_TRACKED_FIELDS,
      ]);
      if (changes.length > 0) {
        logAudit({
          userId: ctx.user.id,
          entityType: AUDIT_ENTITY_TYPES.loan,
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
        .select({ loanId: loans.id })
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(and(eq(loans.id, input.id), eq(properties.userId, ctx.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Loan not found",
        });
      }

      await db.delete(loans).where(eq(loans.id, input.id));

      logAudit({
        userId: ctx.user.id,
        entityType: AUDIT_ENTITY_TYPES.loan,
        entityId: input.id,
        action: "delete",
      });

      return { success: true };
    }),

  getAmortizationSchedule: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [loan] = await db
        .select()
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(and(eq(loans.id, input.id), eq(properties.userId, ctx.user.id)))
        .limit(1);

      if (!loan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Loan not found",
        });
      }

      const loanData = loan.loans;
      const schedule = calculateAmortizationSchedule({
        loanAmount: loanData.loanAmount,
        interestRate: loanData.interestRate,
        monthlyPayment: loanData.monthlyPayment,
        loanStart: loanData.loanStart,
        loanTermMonths: loanData.loanTermMonths ?? undefined,
      });

      const yearlySummary = aggregateYearlySummary(schedule);

      return { schedule, yearlySummary };
    }),
});
