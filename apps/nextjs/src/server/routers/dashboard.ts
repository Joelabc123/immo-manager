import { and, eq, sql, count } from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  properties,
  loans,
  tenants,
  rentalUnits,
  expenses,
  rentPayments,
  actionCenterDismissed,
  users,
} from "@repo/shared/db/schema";
import { PAYMENT_STATUS } from "@repo/shared/types";
import { calculateHealthScore } from "@repo/shared/calculations";
import { calculateWealthForecast } from "@repo/shared/calculations";
import { evaluateActionCenterRules } from "@repo/shared/calculations";
import {
  wealthForecastInput,
  dismissActionItemInput,
} from "@repo/shared/validation";
import { getAllRentBenchmarks } from "../services/market-data";

import { router, protectedProcedure } from "../trpc";

export const dashboardRouter = router({
  getKpis: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch all aggregated data in parallel
    const [
      propertyAgg,
      loanAgg,
      rentAgg,
      expenseAgg,
      userSettings,
      // actionItemCount reserved for future use
    ] = await Promise.all([
      // Properties aggregation
      db
        .select({
          totalProperties: count(),
          totalMarketValue: sql<number>`COALESCE(SUM(COALESCE(${properties.marketValue}, ${properties.purchasePrice})), 0)`,
          totalPurchasePrice: sql<number>`COALESCE(SUM(${properties.purchasePrice}), 0)`,
        })
        .from(properties)
        .where(eq(properties.userId, ctx.user.id)),

      // Loans aggregation
      db
        .select({
          totalRemainingBalance: sql<number>`COALESCE(SUM(${loans.remainingBalance}), 0)`,
          totalMonthlyPayment: sql<number>`COALESCE(SUM(${loans.monthlyPayment}), 0)`,
        })
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(eq(properties.userId, ctx.user.id)),

      // Active tenants rent aggregation
      db
        .select({
          totalMonthlyRent: sql<number>`COALESCE(SUM(${tenants.coldRent}), 0)`,
        })
        .from(tenants)
        .where(
          and(
            eq(tenants.userId, ctx.user.id),
            sql`${tenants.rentStart} <= ${today}`,
            sql`(${tenants.rentEnd} IS NULL OR ${tenants.rentEnd} >= ${today})`,
          ),
        ),

      // Non-apportionable expenses aggregation (annual total)
      db
        .select({
          totalAnnualExpenses: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .innerJoin(properties, eq(expenses.propertyId, properties.id))
        .where(
          and(
            eq(properties.userId, ctx.user.id),
            eq(expenses.isApportionable, false),
          ),
        ),

      // User settings for health score weights
      db
        .select({
          healthScoreCashflowWeight: users.healthScoreCashflowWeight,
          healthScoreLtvWeight: users.healthScoreLtvWeight,
          healthScoreYieldWeight: users.healthScoreYieldWeight,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1),

      // Count of active (non-dismissed) action center items — rough estimate
      // We count properties as a proxy for now
      db
        .select({ count: count() })
        .from(properties)
        .where(eq(properties.userId, ctx.user.id)),
    ]);

    const totalMarketValue = Number(propertyAgg[0].totalMarketValue);
    const totalPurchasePrice = Number(propertyAgg[0].totalPurchasePrice);
    const totalRemainingBalance = Number(loanAgg[0].totalRemainingBalance);
    const totalMonthlyRent = Number(rentAgg[0].totalMonthlyRent);
    const totalMonthlyLoanPayments = Number(loanAgg[0].totalMonthlyPayment);
    const totalMonthlyExpenses = Math.round(
      Number(expenseAgg[0].totalAnnualExpenses) / 12,
    );

    const netWorth = totalMarketValue - totalRemainingBalance;
    const monthlyCashflow =
      totalMonthlyRent - totalMonthlyLoanPayments - totalMonthlyExpenses;
    const totalAnnualRent = totalMonthlyRent * 12;

    const weights = userSettings[0] ?? {
      healthScoreCashflowWeight: 34,
      healthScoreLtvWeight: 33,
      healthScoreYieldWeight: 33,
    };

    const healthScore = calculateHealthScore({
      totalMonthlyCashflow: monthlyCashflow,
      totalMarketValue,
      totalRemainingBalance,
      totalAnnualRent,
      totalPurchasePrice,
      weights: {
        cashflow: weights.healthScoreCashflowWeight,
        ltv: weights.healthScoreLtvWeight,
        yield: weights.healthScoreYieldWeight,
      },
    });

    return {
      netWorth,
      totalMarketValue,
      totalPurchasePrice,
      totalRemainingBalance,
      monthlyCashflow,
      totalMonthlyRent,
      totalMonthlyLoanPayments,
      totalMonthlyExpenses,
      propertyCount: propertyAgg[0].totalProperties,
      healthScore,
    };
  }),

  getWealthForecast: protectedProcedure
    .input(wealthForecastInput)
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0];

      // Fetch all properties with their loans, tenants, and expenses
      const userProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.userId, ctx.user.id));

      if (userProperties.length === 0) {
        return [];
      }

      const propertyIds = userProperties.map((p) => p.id);

      // Fetch loans, active tenants, expenses in parallel
      const [allLoans, activeTenants, allExpenses] = await Promise.all([
        db
          .select()
          .from(loans)
          .where(sql`${loans.propertyId} IN ${propertyIds}`),

        db
          .select()
          .from(tenants)
          .where(
            and(
              eq(tenants.userId, ctx.user.id),
              sql`${tenants.rentStart} <= ${today}`,
              sql`(${tenants.rentEnd} IS NULL OR ${tenants.rentEnd} >= ${today})`,
            ),
          ),

        db
          .select({
            propertyId: expenses.propertyId,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
          })
          .from(expenses)
          .where(
            and(
              sql`${expenses.propertyId} IN ${propertyIds}`,
              eq(expenses.isApportionable, false),
            ),
          )
          .groupBy(expenses.propertyId),
      ]);

      // Group tenants by rental unit to get rent per property
      const unitIds = await db
        .select({ id: rentalUnits.id, propertyId: rentalUnits.propertyId })
        .from(rentalUnits)
        .where(sql`${rentalUnits.propertyId} IN ${propertyIds}`);

      const unitToProperty = new Map(unitIds.map((u) => [u.id, u.propertyId]));

      const rentByProperty = new Map<string, number>();
      for (const tenant of activeTenants) {
        if (!tenant.rentalUnitId) continue;
        const propId = unitToProperty.get(tenant.rentalUnitId);
        if (!propId) continue;
        rentByProperty.set(
          propId,
          (rentByProperty.get(propId) ?? 0) + tenant.coldRent,
        );
      }

      const expenseByProperty = new Map(
        allExpenses.map((e) => [
          e.propertyId,
          Math.round(Number(e.totalAmount) / 12),
        ]),
      );

      const loansByProperty = new Map<string, typeof allLoans>();
      for (const loan of allLoans) {
        const existing = loansByProperty.get(loan.propertyId) ?? [];
        existing.push(loan);
        loansByProperty.set(loan.propertyId, existing);
      }

      // Build forecast input
      const forecastProperties = userProperties.map((p) => ({
        marketValue: p.marketValue ?? p.purchasePrice,
        loans: (loansByProperty.get(p.id) ?? []).map((l) => ({
          remainingBalance: l.remainingBalance,
          interestRate: l.interestRate,
          monthlyPayment: l.monthlyPayment,
        })),
        monthlyRent: rentByProperty.get(p.id) ?? 0,
        monthlyExpenses: expenseByProperty.get(p.id) ?? 0,
      }));

      return calculateWealthForecast({
        properties: forecastProperties,
        growthRate: input.growthRate,
        inflationRate: input.inflationRate,
        rentGrowthRate: input.rentGrowthRate,
        timeHorizonYears: input.timeHorizonYears,
      });
    }),

  getPortfolioAllocation: protectedProcedure.query(async ({ ctx }) => {
    // Fetch user's donut threshold
    const [user] = await db
      .select({ donutThreshold: users.donutThreshold })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    const threshold = user?.donutThreshold ?? 5;

    const userProperties = await db
      .select({
        id: properties.id,
        street: properties.street,
        city: properties.city,
        type: properties.type,
        marketValue: sql<number>`COALESCE(${properties.marketValue}, ${properties.purchasePrice})`,
      })
      .from(properties)
      .where(eq(properties.userId, ctx.user.id));

    const totalMarketValue = userProperties.reduce(
      (sum, p) => sum + Number(p.marketValue),
      0,
    );

    if (totalMarketValue === 0) {
      return { items: [], totalMarketValue: 0, threshold };
    }

    const items = userProperties.map((p) => ({
      propertyId: p.id,
      name: p.street && p.city ? `${p.street}, ${p.city}` : (p.city ?? p.type),
      marketValue: Number(p.marketValue),
      percentage: Math.round(
        (Number(p.marketValue) / totalMarketValue) * 10000,
      ),
    }));

    // Sort by market value descending
    items.sort((a, b) => b.marketValue - a.marketValue);

    return { items, totalMarketValue, threshold };
  }),

  getActionCenterItems: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch all necessary data in parallel
    const [
      userProperties,
      allLoans,
      allTenants,
      allUnits,
      overduePayments,
      dismissed,
    ] = await Promise.all([
      db
        .select({
          id: properties.id,
          status: properties.status,
          livingAreaSqm: properties.livingAreaSqm,
          street: properties.street,
          city: properties.city,
          type: properties.type,
        })
        .from(properties)
        .where(eq(properties.userId, ctx.user.id)),

      db
        .select()
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(eq(properties.userId, ctx.user.id)),

      db.select().from(tenants).where(eq(tenants.userId, ctx.user.id)),

      db
        .select({
          id: rentalUnits.id,
          propertyId: rentalUnits.propertyId,
          areaSqm: rentalUnits.areaSqm,
        })
        .from(rentalUnits)
        .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
        .where(eq(properties.userId, ctx.user.id)),

      db
        .select({
          tenantId: rentPayments.tenantId,
          totalOverdue: sql<number>`COALESCE(SUM(${rentPayments.expectedAmount} - COALESCE(${rentPayments.paidAmount}, 0)), 0)`,
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
        .groupBy(rentPayments.tenantId),

      db
        .select({
          ruleType: actionCenterDismissed.ruleType,
          entityId: actionCenterDismissed.entityId,
        })
        .from(actionCenterDismissed)
        .where(eq(actionCenterDismissed.userId, ctx.user.id)),
    ]);

    // Build property name map
    const propertyNameMap = new Map(
      userProperties.map((p) => [
        p.id,
        p.street && p.city ? `${p.street}, ${p.city}` : (p.city ?? p.type),
      ]),
    );

    // Build unit-to-property mapping
    const unitPropertyMap = new Map(allUnits.map((u) => [u.id, u.propertyId]));

    // Find which units have active tenants
    const activeTenantUnitIds = new Set(
      allTenants
        .filter(
          (t) =>
            t.rentalUnitId &&
            t.rentStart <= today &&
            (!t.rentEnd || t.rentEnd >= today),
        )
        .map((t) => t.rentalUnitId!),
    );

    // Build rental unit data with tenant info
    const rentalUnitData = allUnits.map((u) => {
      const hasTenant = activeTenantUnitIds.has(u.id);
      const tenant = allTenants.find(
        (t) =>
          t.rentalUnitId === u.id &&
          t.rentStart <= today &&
          (!t.rentEnd || t.rentEnd >= today),
      );

      return {
        id: u.id,
        propertyId: u.propertyId,
        propertyName: propertyNameMap.get(u.propertyId) ?? "Unknown",
        areaSqm: u.areaSqm,
        hasTenant,
        monthlyRent: tenant?.coldRent ?? 0,
      };
    });

    // Build loan data
    const loanData = allLoans.map((row) => ({
      id: row.loans.id,
      propertyId: row.loans.propertyId,
      propertyName: propertyNameMap.get(row.loans.propertyId) ?? "Unknown",
      remainingBalance: row.loans.remainingBalance,
      interestRate: row.loans.interestRate,
      monthlyPayment: row.loans.monthlyPayment,
      interestFixedUntil: row.loans.interestFixedUntil,
      annualSpecialRepaymentLimit: row.loans.annualSpecialRepaymentLimit,
    }));

    // Build tenant data
    const tenantData = allTenants.map((t) => {
      const propId = t.rentalUnitId
        ? unitPropertyMap.get(t.rentalUnitId)
        : null;
      return {
        id: t.id,
        propertyName: propId
          ? (propertyNameMap.get(propId) ?? "Unknown")
          : "Unknown",
        firstName: t.firstName,
        lastName: t.lastName,
        coldRent: t.coldRent,
        rentEnd: t.rentEnd,
        rentalUnitId: t.rentalUnitId,
      };
    });

    // Build overdue payment data
    const overdueData = overduePayments.map((op) => {
      const tenant = allTenants.find((t) => t.id === op.tenantId);
      const propId = tenant?.rentalUnitId
        ? unitPropertyMap.get(tenant.rentalUnitId)
        : null;
      return {
        tenantId: op.tenantId,
        tenantName: tenant
          ? `${tenant.firstName} ${tenant.lastName}`
          : "Unknown",
        propertyName: propId
          ? (propertyNameMap.get(propId) ?? "Unknown")
          : "Unknown",
        overdueAmount: Number(op.totalOverdue),
      };
    });

    // Build per-property cashflow data
    const cashflowData = userProperties.map((p) => {
      const propLoans = loanData.filter((l) => l.propertyId === p.id);
      const propUnits = rentalUnitData.filter((u) => u.propertyId === p.id);
      const totalRent = propUnits.reduce((s, u) => s + u.monthlyRent, 0);
      const totalLoanPayments = propLoans.reduce(
        (s, l) => s + l.monthlyPayment,
        0,
      );

      return {
        propertyId: p.id,
        propertyName: propertyNameMap.get(p.id) ?? "Unknown",
        monthlyCashflow: totalRent - totalLoanPayments,
      };
    });

    // Build per-property rent benchmarks from market data
    const cityBenchmarks = await getAllRentBenchmarks();
    const rentBenchmarks = new Map<string, number>();
    for (const p of userProperties) {
      if (p.city) {
        const benchmark = cityBenchmarks.get(p.city.toLowerCase().trim());
        if (benchmark) {
          rentBenchmarks.set(p.id, benchmark);
        }
      }
    }

    return evaluateActionCenterRules({
      properties: userProperties.map((p) => ({
        id: p.id,
        name: propertyNameMap.get(p.id) ?? "Unknown",
        status: p.status,
        livingAreaSqm: p.livingAreaSqm,
      })),
      loans: loanData,
      tenants: tenantData,
      rentalUnits: rentalUnitData,
      overduePayments: overdueData,
      cashflows: cashflowData,
      dismissedRules: dismissed,
      currentDate: today,
      rentBenchmarks: rentBenchmarks.size > 0 ? rentBenchmarks : undefined,
    });
  }),

  dismissActionItem: protectedProcedure
    .input(dismissActionItemInput)
    .mutation(async ({ ctx, input }) => {
      await db.insert(actionCenterDismissed).values({
        userId: ctx.user.id,
        ruleType: input.ruleType,
        entityId: input.entityId,
      });

      return { success: true };
    }),

  undismissActionItem: protectedProcedure
    .input(dismissActionItemInput)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(actionCenterDismissed)
        .where(
          and(
            eq(actionCenterDismissed.userId, ctx.user.id),
            eq(actionCenterDismissed.ruleType, input.ruleType),
            eq(actionCenterDismissed.entityId, input.entityId),
          ),
        );

      return { success: true };
    }),
});
