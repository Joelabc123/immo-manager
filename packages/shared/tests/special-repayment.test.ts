import { describe, it, expect } from "vitest";
import { calculateSpecialRepayment } from "../src/calculations/special-repayment";

describe("calculateSpecialRepayment", () => {
  const baseParams = {
    loanAmount: 20000000, // 200,000 EUR
    interestRate: 350, // 3.5%
    monthlyPayment: 90000, // 900 EUR
    loanStart: "2024-01-01",
    loanTermMonths: 360, // 30 years
    annualSpecialRepayment: 500000, // 5,000 EUR
    annualSpecialRepaymentLimit: 1000000, // 10,000 EUR limit
    projectedRefinanceRate: 400, // 4%
    etfReturnRate: 700, // 7%
    capitalGainsTaxRate: 2500, // 25%
  };

  it("should reduce total interest with special repayments", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.withSpecial.totalInterest).toBeLessThan(
      result.withoutSpecial.totalInterest,
    );
  });

  it("should reduce payoff time with special repayments", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.withSpecial.monthsToPayoff).toBeLessThan(
      result.withoutSpecial.monthsToPayoff,
    );
  });

  it("should calculate interest saved correctly", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.interestSaved).toBe(
      result.withoutSpecial.totalInterest - result.withSpecial.totalInterest,
    );
    expect(result.interestSaved).toBeGreaterThan(0);
  });

  it("should calculate months saved correctly", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.monthsSaved).toBe(
      result.withoutSpecial.monthsToPayoff - result.withSpecial.monthsToPayoff,
    );
    expect(result.monthsSaved).toBeGreaterThan(0);
  });

  it("should enforce special repayment limit", () => {
    const result = calculateSpecialRepayment({
      ...baseParams,
      annualSpecialRepayment: 2000000, // 20,000 EUR - exceeds 10,000 limit
    });
    expect(result.withSpecial.limitExceeded).toBe(true);
    expect(result.withSpecial.effectiveAnnualAmount).toBe(1000000); // Capped at limit
  });

  it("should not flag limit exceeded when within limit", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.withSpecial.limitExceeded).toBe(false);
    expect(result.withSpecial.effectiveAnnualAmount).toBe(500000);
  });

  it("should calculate ETF gross value with compound growth", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.etfComparison.grossValue).toBeGreaterThan(
      result.etfComparison.totalInvested,
    );
  });

  it("should apply capital gains tax only on gains", () => {
    const result = calculateSpecialRepayment(baseParams);
    const gains =
      result.etfComparison.grossValue - result.etfComparison.totalInvested;
    const expectedTax = Math.round(gains * 0.25);
    expect(result.etfComparison.netValue).toBe(
      result.etfComparison.grossValue - expectedTax,
    );
  });

  it("should determine a winner", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(["special_repayment", "etf_investment"]).toContain(result.winner);
    expect(result.advantageAmount).toBeGreaterThanOrEqual(0);
  });

  it("should generate per-year chart data", () => {
    const result = calculateSpecialRepayment(baseParams);
    expect(result.perYear.length).toBeGreaterThan(0);
    // First year: balance with special repayment should be lower
    expect(result.perYear[0].balanceWith).toBeLessThanOrEqual(
      result.perYear[0].balanceWithout,
    );
    // ETF value should grow
    expect(result.perYear[0].etfValue).toBeGreaterThan(0);
  });

  it("should handle zero special repayment limit (no limit)", () => {
    const result = calculateSpecialRepayment({
      ...baseParams,
      annualSpecialRepaymentLimit: 0, // No limit
      annualSpecialRepayment: 5000000, // 50,000 EUR
    });
    expect(result.withSpecial.limitExceeded).toBe(false);
    expect(result.withSpecial.effectiveAnnualAmount).toBe(5000000);
  });
});
