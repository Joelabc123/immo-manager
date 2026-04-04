interface HealthScoreWeights {
  /** Cashflow weight (0-100, all weights should sum to 100) */
  cashflow: number;
  /** LTV weight (0-100) */
  ltv: number;
  /** Yield weight (0-100) */
  yield: number;
}

interface HealthScoreParams {
  /** Total monthly cashflow (before tax) in cents across all properties */
  totalMonthlyCashflow: number;
  /** Total market value in cents across all properties */
  totalMarketValue: number;
  /** Total remaining loan balance in cents across all loans */
  totalRemainingBalance: number;
  /** Total annual cold rent in cents across all active tenants */
  totalAnnualRent: number;
  /** Total purchase price in cents across all properties */
  totalPurchasePrice: number;
  /** User-configurable weights for the three sub-scores */
  weights: HealthScoreWeights;
}

export interface HealthScoreResult {
  /** Overall health score (0-100) */
  score: number;
  /** Cashflow sub-score (0-100) */
  cashflowScore: number;
  /** Loan-to-Value sub-score (0-100) */
  ltvScore: number;
  /** Gross rental yield sub-score (0-100) */
  yieldScore: number;
}

/**
 * Calculates the cashflow sub-score (0-100).
 * Negative cashflow = 0. Zero = 50. Scales linearly up to 100
 * based on cashflow as a percentage of total loan payments.
 *
 * Simple model: positive monthly cashflow in EUR maps to score.
 * 0 EUR/month = 50, 500 EUR/month = 75, 1000+ EUR/month = 100.
 */
function calculateCashflowScore(totalMonthlyCashflow: number): number {
  if (totalMonthlyCashflow <= 0) {
    // Negative cashflow: scale from 0 (very negative) to 50 (zero)
    // -1000 EUR/month = 0, 0 EUR/month = 50
    const cashflowEur = totalMonthlyCashflow / 100;
    return Math.max(0, Math.round(50 + cashflowEur * 0.05));
  }

  // Positive cashflow: scale from 50 to 100
  // 0 EUR/month = 50, 1000 EUR/month = 100
  const cashflowEur = totalMonthlyCashflow / 100;
  return Math.min(100, Math.round(50 + cashflowEur * 0.05));
}

/**
 * Calculates the LTV (Loan-to-Value) sub-score (0-100).
 * LTV 0% = 100, LTV 80% = 20, LTV 100%+ = 0.
 * Formula: max(0, 100 - (ltvPercent * 1.25))
 */
function calculateLtvScore(
  totalRemainingBalance: number,
  totalMarketValue: number,
): number {
  if (totalMarketValue <= 0) {
    return totalRemainingBalance <= 0 ? 100 : 0;
  }

  const ltvPercent = (totalRemainingBalance / totalMarketValue) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - ltvPercent * 1.25)));
}

/**
 * Calculates the gross rental yield sub-score (0-100).
 * 0% yield = 0, 5% = 50, 10%+ = 100.
 * Linear scale: score = yieldPercent * 10, capped at 100.
 */
function calculateYieldScore(
  totalAnnualRent: number,
  totalPurchasePrice: number,
): number {
  if (totalPurchasePrice <= 0) {
    return totalAnnualRent > 0 ? 100 : 0;
  }

  const yieldPercent = (totalAnnualRent / totalPurchasePrice) * 100;
  return Math.min(100, Math.round(yieldPercent * 10));
}

/**
 * Calculates overall portfolio health score and sub-scores.
 * All monetary values are in cents.
 *
 * The overall score is a weighted average of three sub-scores:
 * - Cashflow: Monthly cashflow position
 * - LTV: Loan-to-Value ratio (lower is better)
 * - Yield: Gross rental yield (higher is better)
 *
 * Weights are user-configurable and should sum to 100.
 */
export function calculateHealthScore(
  params: HealthScoreParams,
): HealthScoreResult {
  const {
    totalMonthlyCashflow,
    totalMarketValue,
    totalRemainingBalance,
    totalAnnualRent,
    totalPurchasePrice,
    weights,
  } = params;

  const cashflowScore = calculateCashflowScore(totalMonthlyCashflow);
  const ltvScore = calculateLtvScore(totalRemainingBalance, totalMarketValue);
  const yieldScore = calculateYieldScore(totalAnnualRent, totalPurchasePrice);

  const totalWeight = weights.cashflow + weights.ltv + weights.yield;
  const normalizedWeights =
    totalWeight > 0
      ? {
          cashflow: weights.cashflow / totalWeight,
          ltv: weights.ltv / totalWeight,
          yield: weights.yield / totalWeight,
        }
      : { cashflow: 1 / 3, ltv: 1 / 3, yield: 1 / 3 };

  const score = Math.round(
    cashflowScore * normalizedWeights.cashflow +
      ltvScore * normalizedWeights.ltv +
      yieldScore * normalizedWeights.yield,
  );

  return {
    score,
    cashflowScore,
    ltvScore,
    yieldScore,
  };
}
