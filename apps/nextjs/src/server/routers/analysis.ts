import { and, eq, sql } from "drizzle-orm";
import { db } from "@repo/shared/db";
import {
  properties,
  loans,
  tenants,
  rentalUnits,
  expenses,
} from "@repo/shared/db/schema";
import {
  calculateStressTest,
  calculateSpecialRepayment,
  calculateRefinancing,
  calculateExitStrategy,
  calculateHealthScore,
  calculateRecommendedReserve,
} from "@repo/shared/calculations";
import {
  stressTestInput,
  specialRepaymentInput,
  refinancingInput,
  exitStrategyInput,
} from "@repo/shared/validation";

import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

export const analysisRouter = router({
  /**
   * Portfolio vitality: aggregated health score, break-even rates per property,
   * and refinancing risk (loan volume expiring within a given timeframe).
   */
  getPortfolioVitality: protectedProcedure
    .input(
      z
        .object({
          refinancingRiskYears: z.number().int().min(1).max(10).default(3),
        })
        .default({ refinancingRiskYears: 3 }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0];

      const userProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.userId, ctx.user.id));

      if (userProperties.length === 0) {
        return {
          healthScore: {
            score: 0,
            cashflowScore: 0,
            ltvScore: 0,
            yieldScore: 0,
          },
          statusText: "no_data",
          breakEvenRates: [],
          refinancingRisk: {
            totalVolume: 0,
            expiringVolume: 0,
            expiringCount: 0,
          },
        };
      }

      const propertyIds = userProperties.map((p) => p.id);

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

      // Map rental units -> properties for tenant rent aggregation
      const unitIds = await db
        .select({ id: rentalUnits.id, propertyId: rentalUnits.propertyId })
        .from(rentalUnits)
        .where(sql`${rentalUnits.propertyId} IN ${propertyIds}`);

      const unitToProperty = new Map(unitIds.map((u) => [u.id, u.propertyId]));

      // Aggregate rent by property
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

      // Aggregate expenses by property
      const expenseByProperty = new Map(
        allExpenses.map((e) => [
          e.propertyId,
          Math.round(Number(e.totalAmount) / 12),
        ]),
      );

      // Group loans by property
      const loansByProperty = new Map<string, typeof allLoans>();
      for (const loan of allLoans) {
        const existing = loansByProperty.get(loan.propertyId) ?? [];
        existing.push(loan);
        loansByProperty.set(loan.propertyId, existing);
      }

      // Portfolio-wide aggregations
      const totalMarketValue = userProperties.reduce(
        (sum, p) => sum + (p.marketValue ?? p.purchasePrice),
        0,
      );
      const totalPurchasePrice = userProperties.reduce(
        (sum, p) => sum + p.purchasePrice,
        0,
      );
      const totalRemainingBalance = allLoans.reduce(
        (sum, l) => sum + l.remainingBalance,
        0,
      );
      const totalMonthlyRent = [...rentByProperty.values()].reduce(
        (sum, r) => sum + r,
        0,
      );
      const totalMonthlyLoanPayments = allLoans.reduce(
        (sum, l) => sum + l.monthlyPayment,
        0,
      );
      const totalMonthlyExpenses = [...expenseByProperty.values()].reduce(
        (sum, e) => sum + e,
        0,
      );

      const monthlyCashflow =
        totalMonthlyRent - totalMonthlyLoanPayments - totalMonthlyExpenses;
      const totalAnnualRent = totalMonthlyRent * 12;

      const healthScore = calculateHealthScore({
        totalMonthlyCashflow: monthlyCashflow,
        totalMarketValue,
        totalRemainingBalance,
        totalAnnualRent,
        totalPurchasePrice,
        weights: { cashflow: 34, ltv: 33, yield: 33 },
      });

      // Break-even rate per property
      const breakEvenRates = userProperties.map((prop) => {
        const propLoans = loansByProperty.get(prop.id) ?? [];
        const propRent = rentByProperty.get(prop.id) ?? 0;
        const propExpenses = expenseByProperty.get(prop.id) ?? 0;
        const propTax = prop.propertyTaxAnnual
          ? Math.round(prop.propertyTaxAnnual / 12)
          : 0;
        const reserve = calculateRecommendedReserve(
          prop.constructionYear ?? 2000,
          prop.livingAreaSqm ?? 0,
        );

        if (propLoans.length === 0) {
          return {
            propertyId: prop.id,
            propertyName:
              prop.street && prop.city
                ? `${prop.street}, ${prop.city}`
                : (prop.city ?? prop.type),
            currentWeightedRate: 0,
            breakEvenRate: 0,
            hasLoans: false,
          };
        }

        const stressResult = calculateStressTest({
          loans: propLoans.map((l) => ({
            remainingBalance: l.remainingBalance,
            interestRate: l.interestRate,
            monthlyPayment: l.monthlyPayment,
            remainingTermMonths: l.loanTermMonths ?? undefined,
          })),
          scenarioRate: 0,
          totalColdRent: propRent,
          nonApportionableExpenses: propExpenses,
          propertyTaxMonthly: propTax,
          maintenanceReserve: reserve,
        });

        const totalBalance = propLoans.reduce(
          (sum, l) => sum + l.remainingBalance,
          0,
        );
        const weightedRate =
          totalBalance > 0
            ? Math.round(
                propLoans.reduce(
                  (sum, l) => sum + l.interestRate * l.remainingBalance,
                  0,
                ) / totalBalance,
              )
            : 0;

        return {
          propertyId: prop.id,
          propertyName:
            prop.street && prop.city
              ? `${prop.street}, ${prop.city}`
              : (prop.city ?? prop.type),
          currentWeightedRate: weightedRate,
          breakEvenRate: stressResult.breakEvenRate,
          hasLoans: true,
        };
      });

      // Refinancing risk: loan volume with interestFixedUntil within N years
      const cutoffDate = new Date();
      cutoffDate.setFullYear(
        cutoffDate.getFullYear() + input.refinancingRiskYears,
      );
      const cutoff = cutoffDate.toISOString().split("T")[0];

      const expiringLoans = allLoans.filter(
        (l) => l.interestFixedUntil && l.interestFixedUntil <= cutoff,
      );

      const statusText =
        healthScore.score < 40
          ? "critical"
          : healthScore.score < 60
            ? "needs_improvement"
            : healthScore.score < 80
              ? "stable"
              : "excellent";

      return {
        healthScore,
        statusText,
        breakEvenRates,
        refinancingRisk: {
          totalVolume: totalRemainingBalance,
          expiringVolume: expiringLoans.reduce(
            (sum, l) => sum + l.remainingBalance,
            0,
          ),
          expiringCount: expiringLoans.length,
        },
      };
    }),

  /**
   * Interest Rate Stress Test: portfolio-wide + per-property.
   */
  getStressTest: protectedProcedure
    .input(stressTestInput)
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0];

      const userProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.userId, ctx.user.id));

      if (userProperties.length === 0) {
        return { portfolio: null, perProperty: [] };
      }

      const propertyIds = userProperties.map((p) => p.id);

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

      // Portfolio-wide stress test
      const totalColdRent = [...rentByProperty.values()].reduce(
        (s, r) => s + r,
        0,
      );
      const totalExpenses = [...expenseByProperty.values()].reduce(
        (s, e) => s + e,
        0,
      );
      const totalPropertyTax = userProperties.reduce(
        (sum, p) => sum + Math.round((p.propertyTaxAnnual ?? 0) / 12),
        0,
      );
      const totalReserve = userProperties.reduce(
        (sum, p) =>
          sum +
          calculateRecommendedReserve(
            p.constructionYear ?? 2000,
            p.livingAreaSqm ?? 0,
          ),
        0,
      );

      const portfolioResult = calculateStressTest({
        loans: allLoans.map((l) => ({
          remainingBalance: l.remainingBalance,
          interestRate: l.interestRate,
          monthlyPayment: l.monthlyPayment,
          remainingTermMonths: l.loanTermMonths ?? undefined,
        })),
        scenarioRate: input.scenarioRate,
        totalColdRent,
        nonApportionableExpenses: totalExpenses,
        propertyTaxMonthly: totalPropertyTax,
        maintenanceReserve: totalReserve,
      });

      // Per-property stress test
      const perProperty = userProperties
        .map((prop) => {
          const propLoans = loansByProperty.get(prop.id) ?? [];
          if (propLoans.length === 0) return null;

          const result = calculateStressTest({
            loans: propLoans.map((l) => ({
              remainingBalance: l.remainingBalance,
              interestRate: l.interestRate,
              monthlyPayment: l.monthlyPayment,
              remainingTermMonths: l.loanTermMonths ?? undefined,
            })),
            scenarioRate: input.scenarioRate,
            totalColdRent: rentByProperty.get(prop.id) ?? 0,
            nonApportionableExpenses: expenseByProperty.get(prop.id) ?? 0,
            propertyTaxMonthly: Math.round((prop.propertyTaxAnnual ?? 0) / 12),
            maintenanceReserve: calculateRecommendedReserve(
              prop.constructionYear ?? 2000,
              prop.livingAreaSqm ?? 0,
            ),
          });

          return {
            propertyId: prop.id,
            propertyName:
              prop.street && prop.city
                ? `${prop.street}, ${prop.city}`
                : (prop.city ?? prop.type),
            ...result,
          };
        })
        .filter(Boolean);

      return { portfolio: portfolioResult, perProperty };
    }),

  /**
   * Special Repayment Analysis for a specific loan.
   */
  getSpecialRepaymentAnalysis: protectedProcedure
    .input(specialRepaymentInput)
    .query(async ({ ctx, input }) => {
      // Fetch the loan and verify ownership
      const [loan] = await db
        .select({
          loan: loans,
          propertyUserId: properties.userId,
          propertyName: properties.street,
          propertyCity: properties.city,
        })
        .from(loans)
        .innerJoin(properties, eq(loans.propertyId, properties.id))
        .where(eq(loans.id, input.loanId))
        .limit(1);

      if (!loan || loan.propertyUserId !== ctx.user.id) {
        return null;
      }

      const result = calculateSpecialRepayment({
        loanAmount: loan.loan.remainingBalance,
        interestRate: loan.loan.interestRate,
        monthlyPayment: loan.loan.monthlyPayment,
        loanStart: loan.loan.loanStart,
        loanTermMonths: loan.loan.loanTermMonths ?? undefined,
        annualSpecialRepayment: input.annualSpecialRepayment,
        annualSpecialRepaymentLimit: loan.loan.annualSpecialRepaymentLimit ?? 0,
        projectedRefinanceRate: input.projectedRefinanceRate,
        etfReturnRate: input.etfReturnRate,
        capitalGainsTaxRate: input.capitalGainsTaxRate,
      });

      return {
        loanId: loan.loan.id,
        bankName: loan.loan.bankName,
        propertyName:
          loan.propertyName && loan.propertyCity
            ? `${loan.propertyName}, ${loan.propertyCity}`
            : (loan.propertyCity ?? ""),
        ...result,
      };
    }),

  /**
   * Refinancing Analysis: all loans compared at a new rate.
   */
  getRefinancingAnalysis: protectedProcedure
    .input(refinancingInput)
    .query(async ({ ctx, input }) => {
      const userProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.userId, ctx.user.id));

      if (userProperties.length === 0) {
        return {
          perLoan: [],
          aggregatedAnnualSavings: 0,
          aggregatedTotalInterestSaved: 0,
          worthItCount: 0,
          totalRefinanceCosts: 0,
        };
      }

      const propertyIds = userProperties.map((p) => p.id);
      const propertyMap = new Map(userProperties.map((p) => [p.id, p]));

      const allLoans = await db
        .select()
        .from(loans)
        .where(sql`${loans.propertyId} IN ${propertyIds}`);

      const loanInputs = allLoans.map((loan) => {
        const prop = propertyMap.get(loan.propertyId);
        return {
          loanId: loan.id,
          propertyName:
            prop && prop.street && prop.city
              ? `${prop.street}, ${prop.city}`
              : (prop?.city ?? ""),
          remainingBalance: loan.remainingBalance,
          currentInterestRate: loan.interestRate,
          currentMonthlyPayment: loan.monthlyPayment,
          remainingTermMonths: loan.loanTermMonths ?? 240,
          loanStart: loan.loanStart,
        };
      });

      return calculateRefinancing({
        loans: loanInputs,
        newInterestRate: input.newInterestRate,
        refinanceCosts: input.refinanceCosts,
      });
    }),

  /**
   * Exit Strategy: per-property analysis with speculation tax check.
   */
  getExitStrategy: protectedProcedure
    .input(exitStrategyInput)
    .query(async ({ ctx, input }) => {
      const userProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.userId, ctx.user.id));

      if (userProperties.length === 0) {
        return [];
      }

      const propertyIds = userProperties.map((p) => p.id);

      const allLoans = await db
        .select()
        .from(loans)
        .where(sql`${loans.propertyId} IN ${propertyIds}`);

      const loansByProperty = new Map<string, typeof allLoans>();
      for (const loan of allLoans) {
        const existing = loansByProperty.get(loan.propertyId) ?? [];
        existing.push(loan);
        loansByProperty.set(loan.propertyId, existing);
      }

      return userProperties.map((prop) => {
        const propLoans = loansByProperty.get(prop.id) ?? [];
        const totalRemainingBalance = propLoans.reduce(
          (sum, l) => sum + l.remainingBalance,
          0,
        );
        const totalMonthlyPayment = propLoans.reduce(
          (sum, l) => sum + l.monthlyPayment,
          0,
        );
        const weightedRate =
          totalRemainingBalance > 0
            ? Math.round(
                propLoans.reduce(
                  (sum, l) => sum + l.interestRate * l.remainingBalance,
                  0,
                ) / totalRemainingBalance,
              )
            : 0;

        // Calculate total AfA claimed since purchase
        let depreciationClaimed = 0;
        if (
          prop.depreciationBuildingCost &&
          prop.depreciationRate &&
          prop.depreciationStart
        ) {
          const depStart = new Date(prop.depreciationStart);
          const yearsSinceDep =
            (new Date().getTime() - depStart.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000);
          depreciationClaimed = Math.round(
            prop.depreciationBuildingCost *
              (prop.depreciationRate / 10000) *
              Math.max(0, yearsSinceDep),
          );
        }

        const result = calculateExitStrategy({
          purchasePrice: prop.purchasePrice,
          purchaseDate: prop.purchaseDate,
          currentMarketValue: prop.marketValue ?? prop.purchasePrice,
          annualAppreciation: input.annualAppreciation,
          saleInYears: input.saleInYears,
          brokerFeeRate: input.brokerFeeRate,
          remainingLoanBalance: totalRemainingBalance,
          monthlyLoanPayment: totalMonthlyPayment,
          loanInterestRate: weightedRate,
          personalTaxRate: input.personalTaxRate,
          depreciationClaimed,
        });

        return {
          propertyId: prop.id,
          propertyName:
            prop.street && prop.city
              ? `${prop.street}, ${prop.city}`
              : (prop.city ?? prop.type),
          purchaseDate: prop.purchaseDate,
          ...result,
        };
      });
    }),

  /**
   * Get all user loans for the analysis UI selectors.
   */
  getLoansForAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const userProperties = await db
      .select({
        id: properties.id,
        street: properties.street,
        city: properties.city,
      })
      .from(properties)
      .where(eq(properties.userId, ctx.user.id));

    if (userProperties.length === 0) return [];

    const propertyIds = userProperties.map((p) => p.id);
    const propertyMap = new Map(userProperties.map((p) => [p.id, p]));

    const allLoans = await db
      .select()
      .from(loans)
      .where(sql`${loans.propertyId} IN ${propertyIds}`);

    return allLoans.map((loan) => {
      const prop = propertyMap.get(loan.propertyId);
      return {
        id: loan.id,
        bankName: loan.bankName,
        remainingBalance: loan.remainingBalance,
        interestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        annualSpecialRepaymentLimit: loan.annualSpecialRepaymentLimit,
        propertyName:
          prop && prop.street && prop.city
            ? `${prop.street}, ${prop.city}`
            : (prop?.city ?? ""),
      };
    });
  }),
});
