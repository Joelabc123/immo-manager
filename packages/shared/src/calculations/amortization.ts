interface AmortizationParams {
  /** Loan amount in cents */
  loanAmount: number;
  /** Annual interest rate in basis points (e.g. 350 = 3.50%) */
  interestRate: number;
  /** Monthly payment in cents */
  monthlyPayment: number;
  /** Loan start date as ISO string (YYYY-MM-DD) */
  loanStart: string;
  /** Loan term in months (optional — will calculate until balance is 0) */
  loanTermMonths?: number;
}

export interface AmortizationEntry {
  month: number;
  year: number;
  /** Monthly payment in cents */
  payment: number;
  /** Interest portion in cents */
  interest: number;
  /** Principal portion in cents */
  principal: number;
  /** Remaining balance in cents */
  remainingBalance: number;
  /** Cumulative interest paid in cents */
  cumulativeInterest: number;
  /** Cumulative principal paid in cents */
  cumulativePrincipal: number;
}

export interface YearlySummary {
  year: number;
  /** Total payments in cents */
  totalPayments: number;
  /** Total interest in cents */
  totalInterest: number;
  /** Total principal in cents */
  totalPrincipal: number;
  /** Remaining balance at year end in cents */
  remainingBalance: number;
}

/**
 * Calculates a full annuity loan amortization schedule.
 * All monetary values are in cents, interest rates in basis points.
 */
export function calculateAmortizationSchedule(
  params: AmortizationParams,
): AmortizationEntry[] {
  const {
    loanAmount,
    interestRate,
    monthlyPayment,
    loanStart,
    loanTermMonths,
  } = params;

  if (loanAmount <= 0 || monthlyPayment <= 0) {
    return [];
  }

  const monthlyRate = interestRate / 10000 / 12;
  const startDate = new Date(loanStart);
  const schedule: AmortizationEntry[] = [];

  let remainingBalance = loanAmount;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  const maxMonths = loanTermMonths ?? 600; // 50 years max

  for (let i = 0; i < maxMonths && remainingBalance > 0; i++) {
    const currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + i + 1,
      1,
    );

    const interest = Math.round(remainingBalance * monthlyRate);
    const actualPayment = Math.min(monthlyPayment, remainingBalance + interest);
    const principal = actualPayment - interest;

    remainingBalance = Math.max(0, remainingBalance - principal);
    cumulativeInterest += interest;
    cumulativePrincipal += principal;

    schedule.push({
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      payment: actualPayment,
      interest,
      principal,
      remainingBalance,
      cumulativeInterest,
      cumulativePrincipal,
    });
  }

  return schedule;
}

/**
 * Aggregates monthly amortization entries into yearly summaries.
 */
export function aggregateYearlySummary(
  schedule: AmortizationEntry[],
): YearlySummary[] {
  const yearMap = new Map<number, YearlySummary>();

  for (const entry of schedule) {
    const existing = yearMap.get(entry.year);
    if (existing) {
      existing.totalPayments += entry.payment;
      existing.totalInterest += entry.interest;
      existing.totalPrincipal += entry.principal;
      existing.remainingBalance = entry.remainingBalance;
    } else {
      yearMap.set(entry.year, {
        year: entry.year,
        totalPayments: entry.payment,
        totalInterest: entry.interest,
        totalPrincipal: entry.principal,
        remainingBalance: entry.remainingBalance,
      });
    }
  }

  return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
}
