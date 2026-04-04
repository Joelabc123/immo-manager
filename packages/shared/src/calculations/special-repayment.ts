/**
 * Special Repayment Calculator.
 * Compares paying off a loan faster via special repayments vs. investing in ETFs.
 * All monetary values in cents, rates in basis points.
 * VFE (Vorfaelligkeitsentschaedigung) is NOT considered.
 */

import { calculateAmortizationSchedule } from "./amortization";

interface SpecialRepaymentParams {
  /** Loan amount (remaining balance) in cents */
  loanAmount: number;
  /** Annual interest rate in basis points */
  interestRate: number;
  /** Monthly payment in cents */
  monthlyPayment: number;
  /** Loan start date as ISO string */
  loanStart: string;
  /** Loan term in months (optional) */
  loanTermMonths?: number;
  /** Annual special repayment amount in cents */
  annualSpecialRepayment: number;
  /** Contractual annual special repayment limit in cents (0 = no limit) */
  annualSpecialRepaymentLimit: number;
  /** Projected refinance rate in basis points (for after interest-binding period) */
  projectedRefinanceRate: number;
  /** Expected annual ETF return rate in basis points (default: 700 = 7%) */
  etfReturnRate?: number;
  /** Capital gains tax rate in basis points (default: 2500 = 25%) */
  capitalGainsTaxRate?: number;
}

export interface SpecialRepaymentYearlyEntry {
  year: number;
  /** Remaining balance without special repayment in cents */
  balanceWithout: number;
  /** Remaining balance with special repayment in cents */
  balanceWith: number;
  /** ETF portfolio value (gross, before tax) in cents */
  etfValue: number;
}

interface RepaymentScenario {
  /** Total interest paid over lifetime in cents */
  totalInterest: number;
  /** Number of months to full payoff */
  monthsToPayoff: number;
}

interface EtfComparison {
  /** Gross ETF value at loan payoff (without-special timeline) in cents */
  grossValue: number;
  /** Net ETF value after capital gains tax in cents */
  netValue: number;
  /** Total amount invested in cents */
  totalInvested: number;
}

export interface SpecialRepaymentResult {
  /** Scenario without special repayments */
  withoutSpecial: RepaymentScenario;
  /** Scenario with special repayments */
  withSpecial: RepaymentScenario & {
    /** Whether the requested amount exceeds the contractual limit */
    limitExceeded: boolean;
    /** Effective annual special repayment in cents (capped at limit) */
    effectiveAnnualAmount: number;
  };
  /** ETF investment comparison */
  etfComparison: EtfComparison;
  /** Total interest saved in cents */
  interestSaved: number;
  /** Months saved by special repayments */
  monthsSaved: number;
  /** Winner of the comparison */
  winner: "special_repayment" | "etf_investment";
  /** Monetary advantage of the winner in cents */
  advantageAmount: number;
  /** Per-year data for chart */
  perYear: SpecialRepaymentYearlyEntry[];
}

/**
 * Runs the special repayment vs. ETF comparison.
 */
export function calculateSpecialRepayment(
  params: SpecialRepaymentParams,
): SpecialRepaymentResult {
  const {
    loanAmount,
    interestRate,
    monthlyPayment,
    loanStart,
    loanTermMonths,
    annualSpecialRepayment,
    annualSpecialRepaymentLimit,
    etfReturnRate = 700,
    capitalGainsTaxRate = 2500,
  } = params;

  // Cap at limit if limit is set
  const limitExceeded =
    annualSpecialRepaymentLimit > 0 &&
    annualSpecialRepayment > annualSpecialRepaymentLimit;
  const effectiveAnnualAmount =
    annualSpecialRepaymentLimit > 0
      ? Math.min(annualSpecialRepayment, annualSpecialRepaymentLimit)
      : annualSpecialRepayment;

  // Scenario 1: Without special repayments (standard amortization)
  const scheduleWithout = calculateAmortizationSchedule({
    loanAmount,
    interestRate,
    monthlyPayment,
    loanStart,
    loanTermMonths,
  });

  const withoutSpecial: RepaymentScenario = {
    totalInterest:
      scheduleWithout.length > 0
        ? scheduleWithout[scheduleWithout.length - 1].cumulativeInterest
        : 0,
    monthsToPayoff: scheduleWithout.length,
  };

  // Scenario 2: With special repayments (injected annually)
  const withSpecialResult = calculateWithSpecialRepayments(
    loanAmount,
    interestRate,
    monthlyPayment,
    loanStart,
    loanTermMonths,
    effectiveAnnualAmount,
  );

  // ETF comparison: invest the same annual amount in ETFs over the without-special period
  const investmentYears = Math.ceil(withoutSpecial.monthsToPayoff / 12);
  const etfComparison = calculateEtfComparison(
    effectiveAnnualAmount,
    investmentYears,
    etfReturnRate,
    capitalGainsTaxRate,
  );

  const interestSaved =
    withoutSpecial.totalInterest - withSpecialResult.totalInterest;
  const monthsSaved =
    withoutSpecial.monthsToPayoff - withSpecialResult.monthsToPayoff;

  // Winner: compare interest saved vs. net ETF gains
  const etfNetGain = etfComparison.netValue - etfComparison.totalInvested;
  const winner: "special_repayment" | "etf_investment" =
    interestSaved >= etfNetGain ? "special_repayment" : "etf_investment";
  const advantageAmount = Math.abs(interestSaved - etfNetGain);

  // Per-year chart data
  const perYear = buildPerYearData(
    scheduleWithout,
    withSpecialResult.schedule,
    effectiveAnnualAmount,
    etfReturnRate,
    loanStart,
  );

  return {
    withoutSpecial,
    withSpecial: {
      totalInterest: withSpecialResult.totalInterest,
      monthsToPayoff: withSpecialResult.monthsToPayoff,
      limitExceeded,
      effectiveAnnualAmount,
    },
    etfComparison,
    interestSaved,
    monthsSaved,
    winner,
    advantageAmount,
    perYear,
  };
}

interface WithSpecialResult {
  totalInterest: number;
  monthsToPayoff: number;
  schedule: { month: number; remainingBalance: number }[];
}

/**
 * Simulates amortization with annual special repayments injected.
 */
function calculateWithSpecialRepayments(
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number,
  loanStart: string,
  loanTermMonths: number | undefined,
  annualSpecialRepayment: number,
): WithSpecialResult {
  const monthlyRate = interestRate / 10000 / 12;
  const maxMonths = loanTermMonths ?? 600;
  let remainingBalance = loanAmount;
  let totalInterest = 0;
  const schedule: { month: number; remainingBalance: number }[] = [];
  const startDate = new Date(loanStart);

  for (let i = 0; i < maxMonths && remainingBalance > 0; i++) {
    const interest = Math.round(remainingBalance * monthlyRate);
    const actualPayment = Math.min(monthlyPayment, remainingBalance + interest);
    const principal = actualPayment - interest;
    remainingBalance = Math.max(0, remainingBalance - principal);
    totalInterest += interest;

    // Apply special repayment at end of each year (every 12 months)
    if ((i + 1) % 12 === 0 && remainingBalance > 0) {
      const specialAmount = Math.min(annualSpecialRepayment, remainingBalance);
      remainingBalance -= specialAmount;
    }

    const currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + i + 1,
      1,
    );
    schedule.push({
      month:
        (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
        (currentDate.getMonth() - startDate.getMonth()),
      remainingBalance,
    });
  }

  return {
    totalInterest,
    monthsToPayoff: schedule.length,
    schedule,
  };
}

/**
 * Calculates ETF investment growth with compound interest.
 * Capital gains tax is applied only on gains at the end.
 */
function calculateEtfComparison(
  annualInvestment: number,
  years: number,
  annualReturnBps: number,
  capitalGainsTaxBps: number,
): EtfComparison {
  const annualReturn = annualReturnBps / 10000;
  const taxRate = capitalGainsTaxBps / 10000;

  let grossValue = 0;
  const totalInvested = annualInvestment * years;

  // Compound growth: each year's investment grows for remaining years
  for (let y = 0; y < years; y++) {
    grossValue += annualInvestment * Math.pow(1 + annualReturn, years - y);
  }

  grossValue = Math.round(grossValue);
  const gains = Math.max(0, grossValue - totalInvested);
  const tax = Math.round(gains * taxRate);
  const netValue = grossValue - tax;

  return { grossValue, netValue, totalInvested };
}

/**
 * Builds per-year chart data for the comparison.
 */
function buildPerYearData(
  scheduleWithout: { year: number; remainingBalance: number }[],
  scheduleWith: { month: number; remainingBalance: number }[],
  annualInvestment: number,
  etfReturnBps: number,
  loanStart: string,
): SpecialRepaymentYearlyEntry[] {
  const startYear = new Date(loanStart).getFullYear();
  const maxYears = Math.ceil(scheduleWithout.length / 12);
  const annualReturn = etfReturnBps / 10000;
  const perYear: SpecialRepaymentYearlyEntry[] = [];

  let etfValue = 0;

  for (let y = 0; y < maxYears; y++) {
    // Balance without: last entry of that year
    const withoutIdx = Math.min((y + 1) * 12 - 1, scheduleWithout.length - 1);
    const balanceWithout =
      withoutIdx >= 0 ? scheduleWithout[withoutIdx].remainingBalance : 0;

    // Balance with: last entry of that year
    const withIdx = Math.min((y + 1) * 12 - 1, scheduleWith.length - 1);
    const balanceWith =
      withIdx >= 0 ? scheduleWith[withIdx].remainingBalance : 0;

    // ETF: compound growth
    etfValue = Math.round((etfValue + annualInvestment) * (1 + annualReturn));

    perYear.push({
      year: startYear + y + 1,
      balanceWithout,
      balanceWith,
      etfValue,
    });
  }

  return perYear;
}
