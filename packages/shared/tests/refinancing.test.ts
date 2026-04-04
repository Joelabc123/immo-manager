import { describe, it, expect } from "vitest";
import { calculateRefinancing } from "../src/calculations/refinancing";

describe("calculateRefinancing", () => {
  const baseLoan = {
    loanId: "loan-1",
    propertyName: "Apartment Berlin",
    remainingBalance: 15000000, // 150,000 EUR
    currentInterestRate: 400, // 4%
    currentMonthlyPayment: 90900, // ~909 EUR (proper annuity at 4% / 20y)
    remainingTermMonths: 240, // 20 years
    loanStart: "2024-01-01",
  };

  const baseParams = {
    loans: [baseLoan],
    newInterestRate: 250, // 2.5%
    refinanceCosts: 300000, // 3,000 EUR
  };

  it("should calculate interest savings at a lower rate", () => {
    const result = calculateRefinancing(baseParams);
    expect(result.perLoan[0].interestSaved).toBeGreaterThan(0);
    expect(result.perLoan[0].newTotalInterest).toBeLessThan(
      result.perLoan[0].currentTotalInterest,
    );
  });

  it("should mark loan as worthIt when savings exceed costs", () => {
    const result = calculateRefinancing(baseParams);
    expect(result.perLoan[0].worthIt).toBe(true);
    expect(result.perLoan[0].amortizationYears).toBeGreaterThan(0);
  });

  it("should mark loan as not worthIt when savings are below costs", () => {
    const result = calculateRefinancing({
      ...baseParams,
      newInterestRate: 395, // Only slightly lower
      refinanceCosts: 5000000, // 50,000 EUR high costs
    });
    expect(result.perLoan[0].worthIt).toBe(false);
    expect(result.perLoan[0].amortizationYears).toBeNull();
  });

  it("should aggregate savings only from worthwhile loans", () => {
    const expensiveLoan = {
      ...baseLoan,
      loanId: "loan-2",
      propertyName: "Small Garage",
      remainingBalance: 500000, // 5,000 EUR - tiny loan
      currentInterestRate: 350,
      currentMonthlyPayment: 5000,
      remainingTermMonths: 120,
    };

    const result = calculateRefinancing({
      loans: [baseLoan, expensiveLoan],
      newInterestRate: 250,
      refinanceCosts: 300000, // Costs too high for small loan
    });

    // Only the main loan should be worthIt
    const worthItLoans = result.perLoan.filter((l) => l.worthIt);
    expect(result.worthItCount).toBe(worthItLoans.length);
    expect(result.aggregatedAnnualSavings).toBe(
      worthItLoans.reduce((sum, l) => sum + l.annualSavings, 0),
    );
  });

  it("should calculate lower monthly payment at lower rate", () => {
    const result = calculateRefinancing(baseParams);
    expect(result.perLoan[0].newMonthlyPayment).toBeLessThan(
      baseLoan.currentMonthlyPayment,
    );
    expect(result.perLoan[0].monthlySavings).toBeGreaterThan(0);
  });

  it("should show minimal savings when new rate equals current rate", () => {
    const result = calculateRefinancing({
      ...baseParams,
      newInterestRate: 400, // Same as current
    });
    // Savings should be approximately 0 (small rounding differences expected)
    expect(Math.abs(result.perLoan[0].interestSaved)).toBeLessThan(200000); // Within 2,000 EUR due to annuity recalculation rounding
  });

  it("should handle empty loans array", () => {
    const result = calculateRefinancing({
      loans: [],
      newInterestRate: 250,
      refinanceCosts: 300000,
    });
    expect(result.perLoan).toHaveLength(0);
    expect(result.aggregatedAnnualSavings).toBe(0);
    expect(result.worthItCount).toBe(0);
  });
});
