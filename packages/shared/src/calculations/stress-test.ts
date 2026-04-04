/**
 * Interest Rate Stress Test Calculator.
 * Computes the impact of rate changes on cashflow, DSCR, and break-even rate.
 * All monetary values in cents, rates in basis points.
 */

export interface StressTestLoan {
  /** Remaining balance in cents */
  remainingBalance: number;
  /** Current annual interest rate in basis points */
  interestRate: number;
  /** Current monthly payment in cents */
  monthlyPayment: number;
  /** Remaining term in months (optional) */
  remainingTermMonths?: number;
}

interface StressTestParams {
  loans: StressTestLoan[];
  /** Scenario annual interest rate in basis points */
  scenarioRate: number;
  /** Total monthly cold rent in cents */
  totalColdRent: number;
  /** Non-apportionable expenses in cents (monthly) */
  nonApportionableExpenses: number;
  /** Property tax in cents (monthly) */
  propertyTaxMonthly: number;
  /** Maintenance reserve in cents (monthly) */
  maintenanceReserve: number;
}

export interface StressTestYearlyEntry {
  year: number;
  /** Baseline annual interest cost in cents */
  baselineInterest: number;
  /** Scenario annual interest cost in cents */
  scenarioInterest: number;
}

export interface StressTestResult {
  /** Baseline total monthly loan payments in cents */
  baselineMonthlyPayments: number;
  /** Scenario total monthly loan payments in cents */
  scenarioMonthlyPayments: number;
  /** Monthly cashflow delta in cents (scenario - baseline, negative = worse) */
  cashflowDelta: number;
  /** Baseline monthly cashflow in cents */
  baselineCashflow: number;
  /** Scenario monthly cashflow in cents */
  scenarioCashflow: number;
  /** Debt Service Coverage Ratio under scenario (rent / total obligations) */
  dscr: number;
  /** Break-even interest rate in basis points (where cashflow = 0) */
  breakEvenRate: number;
  /** Per-year interest cost comparison for chart */
  perYear: StressTestYearlyEntry[];
}

/**
 * Calculates the monthly payment for a loan at a given interest rate,
 * keeping the same repayment structure (annuity recalculation).
 * If the original loan had a repayment rate, we recalculate the monthly
 * payment based on the new interest rate + original repayment rate.
 * For simplicity, we recalculate the annuity using the new rate and remaining term.
 */
function calculateMonthlyPaymentAtRate(
  remainingBalance: number,
  annualRateBps: number,
  remainingTermMonths: number,
): number {
  if (remainingBalance <= 0) return 0;
  const monthlyRate = annualRateBps / 10000 / 12;
  if (monthlyRate === 0) {
    return Math.round(remainingBalance / remainingTermMonths);
  }
  // Annuity formula: P * r * (1+r)^n / ((1+r)^n - 1)
  const factor = Math.pow(1 + monthlyRate, remainingTermMonths);
  const payment = (remainingBalance * (monthlyRate * factor)) / (factor - 1);
  return Math.round(payment);
}

/**
 * Calculates annual interest cost for a given rate over a projection period.
 */
function calculateAnnualInterestCosts(
  loans: StressTestLoan[],
  rateBps: number,
  years: number,
): number[] {
  const annualCosts: number[] = [];
  const balances = loans.map((l) => l.remainingBalance);
  const monthlyRate = rateBps / 10000 / 12;

  for (let y = 0; y < years; y++) {
    let yearlyInterest = 0;
    for (let lIdx = 0; lIdx < loans.length; lIdx++) {
      for (let m = 0; m < 12; m++) {
        if (balances[lIdx] <= 0) continue;
        const interest = Math.round(balances[lIdx] * monthlyRate);
        const term = loans[lIdx].remainingTermMonths ?? 360;
        const payment = calculateMonthlyPaymentAtRate(
          loans[lIdx].remainingBalance,
          rateBps,
          term,
        );
        const principal = Math.min(payment - interest, balances[lIdx]);
        balances[lIdx] = Math.max(0, balances[lIdx] - principal);
        yearlyInterest += interest;
      }
    }
    annualCosts.push(yearlyInterest);
  }
  return annualCosts;
}

/**
 * Runs the stress test calculation.
 */
export function calculateStressTest(
  params: StressTestParams,
): StressTestResult {
  const {
    loans,
    scenarioRate,
    totalColdRent,
    nonApportionableExpenses,
    propertyTaxMonthly,
    maintenanceReserve,
  } = params;

  // Baseline: sum of current monthly payments
  const baselineMonthlyPayments = loans.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0,
  );

  // Scenario: recalculate each loan's monthly payment at the scenario rate
  const scenarioMonthlyPayments = loans.reduce((sum, l) => {
    const term = l.remainingTermMonths ?? 360;
    return (
      sum +
      calculateMonthlyPaymentAtRate(l.remainingBalance, scenarioRate, term)
    );
  }, 0);

  const totalObligationsBaseline =
    baselineMonthlyPayments +
    nonApportionableExpenses +
    propertyTaxMonthly +
    maintenanceReserve;
  const totalObligationsScenario =
    scenarioMonthlyPayments +
    nonApportionableExpenses +
    propertyTaxMonthly +
    maintenanceReserve;

  const baselineCashflow = totalColdRent - totalObligationsBaseline;
  const scenarioCashflow = totalColdRent - totalObligationsScenario;
  const cashflowDelta = scenarioCashflow - baselineCashflow;

  // DSCR: rent / total obligations under scenario
  const dscr =
    totalObligationsScenario > 0
      ? Math.round((totalColdRent / totalObligationsScenario) * 100) / 100
      : totalColdRent > 0
        ? 99.99
        : 0;

  // Break-even rate: binary search for rate where cashflow = 0
  const breakEvenRate = findBreakEvenRate(
    loans,
    totalColdRent,
    nonApportionableExpenses,
    propertyTaxMonthly,
    maintenanceReserve,
  );

  // Per-year interest cost comparison (10 years)
  const projectionYears = 10;
  const baselineYearly = calculateAnnualInterestCosts(
    loans,
    loans.length > 0
      ? Math.round(
          loans.reduce(
            (sum, l) => sum + l.interestRate * l.remainingBalance,
            0,
          ) / loans.reduce((sum, l) => sum + l.remainingBalance, 0),
        )
      : 0,
    projectionYears,
  );
  const scenarioYearly = calculateAnnualInterestCosts(
    loans,
    scenarioRate,
    projectionYears,
  );

  const currentYear = new Date().getFullYear();
  const perYear: StressTestYearlyEntry[] = baselineYearly.map(
    (baseline, i) => ({
      year: currentYear + i + 1,
      baselineInterest: baseline,
      scenarioInterest: scenarioYearly[i],
    }),
  );

  return {
    baselineMonthlyPayments,
    scenarioMonthlyPayments,
    cashflowDelta,
    baselineCashflow,
    scenarioCashflow,
    dscr,
    breakEvenRate,
    perYear,
  };
}

/**
 * Binary search for the interest rate (in basis points) where monthly cashflow = 0.
 */
function findBreakEvenRate(
  loans: StressTestLoan[],
  totalColdRent: number,
  nonApportionableExpenses: number,
  propertyTaxMonthly: number,
  maintenanceReserve: number,
): number {
  if (loans.length === 0) return 0;

  const nonLoanObligations =
    nonApportionableExpenses + propertyTaxMonthly + maintenanceReserve;
  const availableForLoans = totalColdRent - nonLoanObligations;

  if (availableForLoans <= 0) return 0;

  let low = 0;
  let high = 2000; // 20%
  const maxIterations = 50;

  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.round((low + high) / 2);
    const payment = loans.reduce((sum, l) => {
      const term = l.remainingTermMonths ?? 360;
      return sum + calculateMonthlyPaymentAtRate(l.remainingBalance, mid, term);
    }, 0);

    if (Math.abs(payment - availableForLoans) < 100) {
      // Within 1 EUR accuracy
      return mid;
    }

    if (payment < availableForLoans) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.round((low + high) / 2);
}
