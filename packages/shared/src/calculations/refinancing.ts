/**
 * Refinancing (Umschuldung) Calculator.
 * Compares current loan terms vs. refinancing at a new rate.
 * NO VFE (Vorfaelligkeitsentschaedigung) considered.
 * All monetary values in cents, rates in basis points.
 */

import { calculateAmortizationSchedule } from "./amortization";

interface RefinancingLoanInput {
  /** Unique loan identifier */
  loanId: string;
  /** Property name for display */
  propertyName: string;
  /** Remaining balance in cents */
  remainingBalance: number;
  /** Current annual interest rate in basis points */
  currentInterestRate: number;
  /** Current monthly payment in cents */
  currentMonthlyPayment: number;
  /** Remaining term in months */
  remainingTermMonths: number;
  /** Loan start date as ISO string */
  loanStart: string;
}

interface RefinancingParams {
  loans: RefinancingLoanInput[];
  /** New annual interest rate in basis points */
  newInterestRate: number;
  /** Fixed refinancing costs in cents (notary, land registry, etc.) */
  refinanceCosts: number;
}

export interface RefinancingLoanResult {
  loanId: string;
  propertyName: string;
  /** Remaining balance in cents */
  remainingBalance: number;
  /** Current rate in basis points */
  currentInterestRate: number;
  /** New rate in basis points */
  newInterestRate: number;
  /** Total interest at current rate over remaining term in cents */
  currentTotalInterest: number;
  /** Total interest at new rate over remaining term in cents */
  newTotalInterest: number;
  /** Total interest saved in cents */
  interestSaved: number;
  /** Annual savings in cents */
  annualSavings: number;
  /** Whether refinancing is financially worthwhile */
  worthIt: boolean;
  /** Years until cumulative savings exceed refinancing costs (null if not worthIt) */
  amortizationYears: number | null;
  /** New monthly payment in cents */
  newMonthlyPayment: number;
  /** Monthly savings in cents */
  monthlySavings: number;
}

export interface RefinancingResult {
  /** Per-loan analysis */
  perLoan: RefinancingLoanResult[];
  /** Aggregated annual savings across all worthwhile loans in cents */
  aggregatedAnnualSavings: number;
  /** Aggregated total interest saved across all worthwhile loans in cents */
  aggregatedTotalInterestSaved: number;
  /** Number of loans where refinancing is worthwhile */
  worthItCount: number;
  /** Total refinancing costs across all worthwhile loans in cents */
  totalRefinanceCosts: number;
}

/**
 * Calculates the new monthly payment for an annuity loan at a new rate.
 */
function calculateAnnuityPayment(
  principal: number,
  annualRateBps: number,
  termMonths: number,
): number {
  if (principal <= 0) return 0;
  const monthlyRate = annualRateBps / 10000 / 12;
  if (monthlyRate === 0) {
    return Math.round(principal / termMonths);
  }
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return Math.round((principal * (monthlyRate * factor)) / (factor - 1));
}

/**
 * Runs the refinancing analysis.
 */
export function calculateRefinancing(
  params: RefinancingParams,
): RefinancingResult {
  const { loans, newInterestRate, refinanceCosts } = params;

  const perLoan: RefinancingLoanResult[] = loans.map((loan) => {
    // Current scenario: total interest over remaining term
    const currentSchedule = calculateAmortizationSchedule({
      loanAmount: loan.remainingBalance,
      interestRate: loan.currentInterestRate,
      monthlyPayment: loan.currentMonthlyPayment,
      loanStart: loan.loanStart,
      loanTermMonths: loan.remainingTermMonths,
    });

    const currentTotalInterest =
      currentSchedule.length > 0
        ? currentSchedule[currentSchedule.length - 1].cumulativeInterest
        : 0;

    // New scenario: same term, new rate
    const newMonthlyPayment = calculateAnnuityPayment(
      loan.remainingBalance,
      newInterestRate,
      loan.remainingTermMonths,
    );

    const newSchedule = calculateAmortizationSchedule({
      loanAmount: loan.remainingBalance,
      interestRate: newInterestRate,
      monthlyPayment: newMonthlyPayment,
      loanStart: loan.loanStart,
      loanTermMonths: loan.remainingTermMonths,
    });

    const newTotalInterest =
      newSchedule.length > 0
        ? newSchedule[newSchedule.length - 1].cumulativeInterest
        : 0;

    const interestSaved = currentTotalInterest - newTotalInterest;
    const remainingYears = loan.remainingTermMonths / 12;
    const annualSavings =
      remainingYears > 0 ? Math.round(interestSaved / remainingYears) : 0;
    const monthlySavings = loan.currentMonthlyPayment - newMonthlyPayment;

    // Worth it: total savings must exceed refinancing costs
    const worthIt = interestSaved > refinanceCosts;

    // Amortization point: years until cumulative savings exceed costs
    let amortizationYears: number | null = null;
    if (worthIt && annualSavings > 0) {
      amortizationYears = Math.ceil(refinanceCosts / annualSavings);
    }

    return {
      loanId: loan.loanId,
      propertyName: loan.propertyName,
      remainingBalance: loan.remainingBalance,
      currentInterestRate: loan.currentInterestRate,
      newInterestRate,
      currentTotalInterest,
      newTotalInterest,
      interestSaved,
      annualSavings,
      worthIt,
      amortizationYears,
      newMonthlyPayment,
      monthlySavings,
    };
  });

  const worthItLoans = perLoan.filter((l) => l.worthIt);

  return {
    perLoan,
    aggregatedAnnualSavings: worthItLoans.reduce(
      (sum, l) => sum + l.annualSavings,
      0,
    ),
    aggregatedTotalInterestSaved: worthItLoans.reduce(
      (sum, l) => sum + l.interestSaved,
      0,
    ),
    worthItCount: worthItLoans.length,
    totalRefinanceCosts: worthItLoans.length * refinanceCosts,
  };
}
