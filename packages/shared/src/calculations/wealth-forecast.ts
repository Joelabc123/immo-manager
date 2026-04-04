import { calculateAmortizationSchedule } from "./amortization";

interface LoanForecastInput {
  /** Remaining balance in cents */
  remainingBalance: number;
  /** Annual interest rate in basis points */
  interestRate: number;
  /** Monthly payment in cents */
  monthlyPayment: number;
}

interface PropertyForecastInput {
  /** Current market value in cents (falls back to purchase price if not set) */
  marketValue: number;
  /** Loans associated with this property */
  loans: LoanForecastInput[];
  /** Total monthly cold rent from active tenants in cents */
  monthlyRent: number;
  /** Total monthly non-apportionable expenses in cents */
  monthlyExpenses: number;
}

interface WealthForecastParams {
  /** Properties with their loans, rents, and expenses */
  properties: PropertyForecastInput[];
  /** Annual market value growth rate in basis points (e.g. 200 = 2.00%) */
  growthRate: number;
  /** Annual inflation rate in basis points (e.g. 200 = 2.00%) */
  inflationRate: number;
  /** Annual rent growth rate in basis points (e.g. 150 = 1.50%) */
  rentGrowthRate: number;
  /** Number of years to forecast */
  timeHorizonYears: number;
}

export interface WealthForecastEntry {
  /** Year number (0 = current, 1 = first year, etc.) */
  year: number;
  /** Total market value across all properties in cents */
  marketValue: number;
  /** Total remaining loan balance across all loans in cents */
  remainingBalance: number;
  /** Net wealth (marketValue - remainingBalance) in cents */
  netWealth: number;
  /** Total annual rent in cents */
  annualRent: number;
  /** Total annual cashflow (rent - expenses - loan payments) in cents */
  annualCashflow: number;
}

/**
 * Projects loan balance after a given number of months.
 * Uses the amortization schedule to find the remaining balance.
 */
function projectLoanBalance(loan: LoanForecastInput, months: number): number {
  if (loan.remainingBalance <= 0 || loan.monthlyPayment <= 0) {
    return 0;
  }

  const schedule = calculateAmortizationSchedule({
    loanAmount: loan.remainingBalance,
    interestRate: loan.interestRate,
    monthlyPayment: loan.monthlyPayment,
    loanStart: new Date().toISOString().split("T")[0],
    loanTermMonths: months,
  });

  if (schedule.length === 0) {
    return loan.remainingBalance;
  }

  // Return the remaining balance at the end of the projection period
  return schedule[schedule.length - 1].remainingBalance;
}

/**
 * Calculates the total annual loan payments for a set of loans.
 */
function calculateAnnualLoanPayments(loans: LoanForecastInput[]): number {
  return loans.reduce((sum, loan) => {
    if (loan.remainingBalance <= 0) return sum;
    return sum + loan.monthlyPayment * 12;
  }, 0);
}

/**
 * Calculates a wealth forecast projection over multiple years.
 * All monetary values are in cents, rates in basis points.
 *
 * Model:
 * - Market values compound annually at growthRate
 * - Rents increase annually at rentGrowthRate
 * - Expenses inflate annually at inflationRate
 * - Loan balances reduce per amortization schedule
 * - Cashflow = annual rent - annual expenses - annual loan payments
 */
export function calculateWealthForecast(
  params: WealthForecastParams,
): WealthForecastEntry[] {
  const {
    properties,
    growthRate,
    inflationRate,
    rentGrowthRate,
    timeHorizonYears,
  } = params;

  if (properties.length === 0 || timeHorizonYears <= 0) {
    return [];
  }

  const growthMultiplier = 1 + growthRate / 10000;
  const rentMultiplier = 1 + rentGrowthRate / 10000;
  const inflationMultiplier = 1 + inflationRate / 10000;

  const entries: WealthForecastEntry[] = [];

  // Year 0 — current state
  const currentMarketValue = properties.reduce(
    (sum, p) => sum + p.marketValue,
    0,
  );
  const currentRemainingBalance = properties.reduce(
    (sum, p) => sum + p.loans.reduce((s, l) => s + l.remainingBalance, 0),
    0,
  );
  const currentAnnualRent = properties.reduce(
    (sum, p) => sum + p.monthlyRent * 12,
    0,
  );
  const currentAnnualExpenses = properties.reduce(
    (sum, p) => sum + p.monthlyExpenses * 12,
    0,
  );
  const currentAnnualLoanPayments = properties.reduce(
    (sum, p) => sum + calculateAnnualLoanPayments(p.loans),
    0,
  );

  entries.push({
    year: 0,
    marketValue: currentMarketValue,
    remainingBalance: currentRemainingBalance,
    netWealth: currentMarketValue - currentRemainingBalance,
    annualRent: currentAnnualRent,
    annualCashflow:
      currentAnnualRent - currentAnnualExpenses - currentAnnualLoanPayments,
  });

  // Project each subsequent year
  for (let y = 1; y <= timeHorizonYears; y++) {
    // Market value compounds
    const marketValue = Math.round(
      currentMarketValue * Math.pow(growthMultiplier, y),
    );

    // Rent grows
    const annualRent = Math.round(
      currentAnnualRent * Math.pow(rentMultiplier, y),
    );

    // Expenses inflate
    const annualExpenses = Math.round(
      currentAnnualExpenses * Math.pow(inflationMultiplier, y),
    );

    // Loan balances project via amortization (months = y * 12)
    const remainingBalance = properties.reduce((sum, p) => {
      return (
        sum + p.loans.reduce((s, l) => s + projectLoanBalance(l, y * 12), 0)
      );
    }, 0);

    // Annual loan payments — only for loans that still have balance
    const annualLoanPayments = properties.reduce((sum, p) => {
      return (
        sum +
        p.loans.reduce((s, l) => {
          const projectedBalance = projectLoanBalance(l, (y - 1) * 12);
          if (projectedBalance <= 0) return s;
          return s + l.monthlyPayment * 12;
        }, 0)
      );
    }, 0);

    const annualCashflow = annualRent - annualExpenses - annualLoanPayments;

    entries.push({
      year: y,
      marketValue,
      remainingBalance,
      netWealth: marketValue - remainingBalance,
      annualRent,
      annualCashflow,
    });
  }

  return entries;
}
