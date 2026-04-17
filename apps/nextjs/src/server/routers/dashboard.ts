import { and, eq, sql, count, gte, lte } from "drizzle-orm";
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

  getRentIncomeTimeline: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const result = await db
      .select({
        month: sql<string>`to_char(${rentPayments.dueDate}, 'YYYY-MM')`,
        amount: sql<number>`COALESCE(SUM(COALESCE(${rentPayments.paidAmount}, 0)), 0)`,
      })
      .from(rentPayments)
      .innerJoin(tenants, eq(rentPayments.tenantId, tenants.id))
      .where(
        and(
          eq(tenants.userId, ctx.user.id),
          gte(
            rentPayments.dueDate,
            twelveMonthsAgo.toISOString().split("T")[0],
          ),
        ),
      )
      .groupBy(sql`to_char(${rentPayments.dueDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${rentPayments.dueDate}, 'YYYY-MM')`);

    return result.map((r) => ({
      month: r.month,
      amount: Number(r.amount),
    }));
  }),

  getVacancyRate: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    const allUnits = await db
      .select({
        id: rentalUnits.id,
        name: rentalUnits.name,
        propertyId: rentalUnits.propertyId,
      })
      .from(rentalUnits)
      .innerJoin(properties, eq(rentalUnits.propertyId, properties.id))
      .where(eq(properties.userId, ctx.user.id));

    const activeTenantUnits = await db
      .select({ rentalUnitId: tenants.rentalUnitId })
      .from(tenants)
      .where(
        and(
          eq(tenants.userId, ctx.user.id),
          sql`${tenants.rentStart} <= ${today}`,
          sql`(${tenants.rentEnd} IS NULL OR ${tenants.rentEnd} >= ${today})`,
        ),
      );

    const occupiedIds = new Set(
      activeTenantUnits
        .map((t) => t.rentalUnitId)
        .filter((id): id is string => id !== null),
    );

    const vacantUnits = allUnits.filter((u) => !occupiedIds.has(u.id));

    return {
      totalUnits: allUnits.length,
      occupiedUnits: allUnits.length - vacantUnits.length,
      vacantUnits: vacantUnits.length,
      vacantUnitNames: vacantUnits.map((u) => u.name),
    };
  }),

  getUpcomingDeadlines: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const ninetyDaysLater = new Date(today);
    ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);
    const todayStr = today.toISOString().split("T")[0];
    const futureStr = ninetyDaysLater.toISOString().split("T")[0];

    const propertyNameMap = new Map<string, string>();
    const userProperties = await db
      .select({
        id: properties.id,
        street: properties.street,
        city: properties.city,
        type: properties.type,
      })
      .from(properties)
      .where(eq(properties.userId, ctx.user.id));

    for (const p of userProperties) {
      propertyNameMap.set(
        p.id,
        p.street && p.city ? `${p.street}, ${p.city}` : (p.city ?? p.type),
      );
    }

    const propertyIds = userProperties.map((p) => p.id);
    if (propertyIds.length === 0) return [];

    const deadlines: Array<{
      id: string;
      type: string;
      label: string;
      propertyName: string;
      date: string;
      daysRemaining: number;
    }> = [];

    // Interest binding expiry
    const expiringLoans = await db
      .select({
        id: loans.id,
        propertyId: loans.propertyId,
        bankName: loans.bankName,
        interestFixedUntil: loans.interestFixedUntil,
      })
      .from(loans)
      .where(
        and(
          sql`${loans.propertyId} IN ${propertyIds}`,
          sql`${loans.interestFixedUntil} IS NOT NULL`,
          gte(loans.interestFixedUntil, todayStr),
          lte(loans.interestFixedUntil, futureStr),
        ),
      );

    for (const loan of expiringLoans) {
      if (!loan.interestFixedUntil) continue;
      const expiryDate = new Date(loan.interestFixedUntil);
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      deadlines.push({
        id: `loan-${loan.id}`,
        type: "interest_binding",
        label: loan.bankName,
        propertyName: propertyNameMap.get(loan.propertyId) ?? "Unknown",
        date: loan.interestFixedUntil,
        daysRemaining,
      });
    }

    // Contract expiry (tenant rentEnd)
    const expiringTenants = await db
      .select({
        id: tenants.id,
        firstName: tenants.firstName,
        lastName: tenants.lastName,
        rentalUnitId: tenants.rentalUnitId,
        rentEnd: tenants.rentEnd,
      })
      .from(tenants)
      .where(
        and(
          eq(tenants.userId, ctx.user.id),
          sql`${tenants.rentEnd} IS NOT NULL`,
          gte(tenants.rentEnd, todayStr),
          lte(tenants.rentEnd, futureStr),
        ),
      );

    const unitToProperty = new Map<string, string>();
    if (expiringTenants.length > 0) {
      const units = await db
        .select({ id: rentalUnits.id, propertyId: rentalUnits.propertyId })
        .from(rentalUnits)
        .where(sql`${rentalUnits.propertyId} IN ${propertyIds}`);
      for (const u of units) {
        unitToProperty.set(u.id, u.propertyId);
      }
    }

    for (const tenant of expiringTenants) {
      if (!tenant.rentEnd) continue;
      const expiryDate = new Date(tenant.rentEnd);
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      const propId = tenant.rentalUnitId
        ? unitToProperty.get(tenant.rentalUnitId)
        : null;
      deadlines.push({
        id: `tenant-${tenant.id}`,
        type: "contract_expiry",
        label: `${tenant.firstName} ${tenant.lastName}`,
        propertyName: propId
          ? (propertyNameMap.get(propId) ?? "Unknown")
          : "Unknown",
        date: tenant.rentEnd,
        daysRemaining,
      });
    }

    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return deadlines.slice(0, 10);
  }),

  getRentArrears: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const overduePayments = await db
      .select({
        tenantId: rentPayments.tenantId,
        expectedAmount: rentPayments.expectedAmount,
        paidAmount: rentPayments.paidAmount,
        dueDate: rentPayments.dueDate,
      })
      .from(rentPayments)
      .innerJoin(tenants, eq(rentPayments.tenantId, tenants.id))
      .where(
        and(
          eq(tenants.userId, ctx.user.id),
          eq(rentPayments.status, PAYMENT_STATUS.pending),
          sql`${rentPayments.dueDate} < ${todayStr}`,
        ),
      );

    const buckets = [
      { label: "0-30", amount: 0, count: 0 },
      { label: "30-60", amount: 0, count: 0 },
      { label: "60+", amount: 0, count: 0 },
    ];

    const tenantBuckets = new Map<string, Set<string>>();

    for (const payment of overduePayments) {
      const dueDate = new Date(payment.dueDate);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const overdue = payment.expectedAmount - (payment.paidAmount ?? 0);

      let bucketIndex: number;
      if (daysOverdue <= 30) {
        bucketIndex = 0;
      } else if (daysOverdue <= 60) {
        bucketIndex = 1;
      } else {
        bucketIndex = 2;
      }

      buckets[bucketIndex].amount += overdue;
      if (!tenantBuckets.has(buckets[bucketIndex].label)) {
        tenantBuckets.set(buckets[bucketIndex].label, new Set());
      }
      tenantBuckets.get(buckets[bucketIndex].label)!.add(payment.tenantId);
    }

    for (const bucket of buckets) {
      bucket.count = tenantBuckets.get(bucket.label)?.size ?? 0;
    }

    const totalOverdue = buckets.reduce((sum, b) => sum + b.amount, 0);

    return { buckets, totalOverdue };
  }),

  getExpensesByCategory: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select({
        category: expenses.category,
        amount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .innerJoin(properties, eq(expenses.propertyId, properties.id))
      .where(eq(properties.userId, ctx.user.id))
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    return result.map((r) => ({
      category: r.category,
      amount: Number(r.amount),
    }));
  }),

  getLtvOverview: protectedProcedure.query(async ({ ctx }) => {
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

    if (userProperties.length === 0) return [];

    const propertyIds = userProperties.map((p) => p.id);

    const loanAggs = await db
      .select({
        propertyId: loans.propertyId,
        totalRemaining: sql<number>`COALESCE(SUM(${loans.remainingBalance}), 0)`,
      })
      .from(loans)
      .where(sql`${loans.propertyId} IN ${propertyIds}`)
      .groupBy(loans.propertyId);

    const loanMap = new Map(
      loanAggs.map((l) => [l.propertyId, Number(l.totalRemaining)]),
    );

    return userProperties
      .map((p) => {
        const remaining = loanMap.get(p.id) ?? 0;
        const marketValue = Number(p.marketValue);
        const ltv = marketValue > 0 ? (remaining / marketValue) * 100 : 0;

        return {
          propertyId: p.id,
          propertyName:
            p.street && p.city ? `${p.street}, ${p.city}` : (p.city ?? p.type),
          ltv,
        };
      })
      .filter((p) => p.ltv > 0)
      .sort((a, b) => b.ltv - a.ltv);
  }),

  getMarketComparison: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const cityBenchmarks = await getAllRentBenchmarks();

    const userProperties = await db
      .select({
        id: properties.id,
        street: properties.street,
        city: properties.city,
        type: properties.type,
        livingAreaSqm: properties.livingAreaSqm,
      })
      .from(properties)
      .where(eq(properties.userId, ctx.user.id));

    if (userProperties.length === 0) return [];

    const propertyIds = userProperties.map((p) => p.id);

    const unitIds = await db
      .select({ id: rentalUnits.id, propertyId: rentalUnits.propertyId })
      .from(rentalUnits)
      .where(sql`${rentalUnits.propertyId} IN ${propertyIds}`);

    const unitToProperty = new Map(unitIds.map((u) => [u.id, u.propertyId]));

    const activeTenants = await db
      .select({
        rentalUnitId: tenants.rentalUnitId,
        coldRent: tenants.coldRent,
      })
      .from(tenants)
      .where(
        and(
          eq(tenants.userId, ctx.user.id),
          sql`${tenants.rentStart} <= ${today}`,
          sql`(${tenants.rentEnd} IS NULL OR ${tenants.rentEnd} >= ${today})`,
        ),
      );

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

    const result: Array<{
      propertyId: string;
      propertyName: string;
      actualRentSqm: number;
      benchmarkRentSqm: number;
    }> = [];

    for (const p of userProperties) {
      if (!p.city || !p.livingAreaSqm || p.livingAreaSqm === 0) continue;
      const benchmark = cityBenchmarks.get(p.city.toLowerCase().trim());
      if (!benchmark) continue;

      const totalRent = rentByProperty.get(p.id) ?? 0;
      const actualPerSqm = Math.round(totalRent / p.livingAreaSqm);

      result.push({
        propertyId: p.id,
        propertyName:
          p.street && p.city ? `${p.street}, ${p.city}` : (p.city ?? p.type),
        actualRentSqm: actualPerSqm,
        benchmarkRentSqm: benchmark,
      });
    }

    return result;
  }),

  getAmortizationProgress: protectedProcedure.query(async ({ ctx }) => {
    const userLoans = await db
      .select({
        id: loans.id,
        propertyId: loans.propertyId,
        bankName: loans.bankName,
        loanAmount: loans.loanAmount,
        remainingBalance: loans.remainingBalance,
      })
      .from(loans)
      .innerJoin(properties, eq(loans.propertyId, properties.id))
      .where(eq(properties.userId, ctx.user.id));

    const propertyNames = await db
      .select({
        id: properties.id,
        street: properties.street,
        city: properties.city,
        type: properties.type,
      })
      .from(properties)
      .where(eq(properties.userId, ctx.user.id));

    const nameMap = new Map(
      propertyNames.map((p) => [
        p.id,
        p.street && p.city ? `${p.street}, ${p.city}` : (p.city ?? p.type),
      ]),
    );

    return userLoans.map((loan) => ({
      loanId: loan.id,
      bankName: loan.bankName,
      propertyName: nameMap.get(loan.propertyId) ?? "Unknown",
      originalAmount: loan.loanAmount,
      remainingBalance: loan.remainingBalance,
    }));
  }),
});
