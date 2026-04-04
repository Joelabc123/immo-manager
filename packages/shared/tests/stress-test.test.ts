import { describe, it, expect } from "vitest";
import { calculateStressTest } from "../src/calculations/stress-test";

describe("calculateStressTest", () => {
  const baseLoan = {
    remainingBalance: 20000000, // 200,000 EUR
    interestRate: 350, // 3.5%
    monthlyPayment: 90000, // 900 EUR
    remainingTermMonths: 300, // 25 years
  };

  const baseParams = {
    loans: [baseLoan],
    scenarioRate: 600, // 6%
    totalColdRent: 120000, // 1,200 EUR
    nonApportionableExpenses: 10000, // 100 EUR
    propertyTaxMonthly: 5000, // 50 EUR
    maintenanceReserve: 8000, // 80 EUR
  };

  it("should calculate baseline monthly payments from loan data", () => {
    const result = calculateStressTest(baseParams);
    expect(result.baselineMonthlyPayments).toBe(90000); // 900 EUR
  });

  it("should calculate higher scenario payments at higher rate", () => {
    const result = calculateStressTest(baseParams);
    // At 6% vs 3.5%, monthly payment should be higher
    expect(result.scenarioMonthlyPayments).toBeGreaterThan(
      result.baselineMonthlyPayments,
    );
  });

  it("should show negative cashflow delta when rates increase", () => {
    const result = calculateStressTest(baseParams);
    expect(result.cashflowDelta).toBeLessThan(0);
  });

  it("should calculate DSCR correctly", () => {
    const result = calculateStressTest(baseParams);
    // DSCR = totalColdRent / totalObligations
    // totalObligations = scenarioPayments + 10000 + 5000 + 8000
    expect(result.dscr).toBeGreaterThan(0);
    expect(result.dscr).toBeLessThan(10);
  });

  it("should find a break-even rate", () => {
    const result = calculateStressTest(baseParams);
    // Break-even rate should be higher than current rate (since we have positive baseline cashflow)
    expect(result.breakEvenRate).toBeGreaterThan(0);
  });

  it("should generate per-year chart data", () => {
    const result = calculateStressTest(baseParams);
    expect(result.perYear.length).toBe(10);
    expect(result.perYear[0].year).toBe(new Date().getFullYear() + 1);
    // Scenario interest should be higher than baseline at higher rate
    expect(result.perYear[0].scenarioInterest).toBeGreaterThan(
      result.perYear[0].baselineInterest,
    );
  });

  it("should handle empty loans array", () => {
    const result = calculateStressTest({
      ...baseParams,
      loans: [],
    });
    expect(result.baselineMonthlyPayments).toBe(0);
    expect(result.scenarioMonthlyPayments).toBe(0);
    expect(result.breakEvenRate).toBe(0);
  });

  it("should handle multiple loans", () => {
    const secondLoan = {
      remainingBalance: 10000000, // 100,000 EUR
      interestRate: 200, // 2%
      monthlyPayment: 50000, // 500 EUR
      remainingTermMonths: 240, // 20 years
    };

    const result = calculateStressTest({
      ...baseParams,
      loans: [baseLoan, secondLoan],
    });

    expect(result.baselineMonthlyPayments).toBe(140000); // 900 + 500
    expect(result.scenarioMonthlyPayments).toBeGreaterThan(140000);
  });

  it("should show DSCR above 1 when rent covers all obligations", () => {
    const result = calculateStressTest({
      ...baseParams,
      scenarioRate: 100, // Very low 1% rate
      totalColdRent: 200000, // 2,000 EUR, well above obligations
    });
    expect(result.dscr).toBeGreaterThan(1);
  });
});
