import { describe, it, expect } from "vitest";
import { calculateExitStrategy } from "../src/calculations/exit-strategy";

describe("calculateExitStrategy", () => {
  const baseParams = {
    purchasePrice: 25000000, // 250,000 EUR
    purchaseDate: "2020-01-15",
    currentMarketValue: 28000000, // 280,000 EUR
    annualAppreciation: 200, // 2%
    saleInYears: 5,
    brokerFeeRate: 357, // 3.57%
    remainingLoanBalance: 18000000, // 180,000 EUR
    monthlyLoanPayment: 90000, // 900 EUR
    loanInterestRate: 350, // 3.5%
    personalTaxRate: 4200, // 42%
    depreciationClaimed: 1000000, // 10,000 EUR
  };

  it("should project sale price with compound appreciation", () => {
    const result = calculateExitStrategy(baseParams);
    // 280,000 * (1.02)^5 ≈ 309,133
    const expected = Math.round(28000000 * Math.pow(1.02, 5));
    expect(result.projectedSalePrice).toBe(expected);
  });

  it("should calculate broker fee correctly", () => {
    const result = calculateExitStrategy(baseParams);
    const expectedFee = Math.round(result.projectedSalePrice * 0.0357);
    expect(result.brokerFee).toBe(expectedFee);
  });

  it("should detect sale within speculation period (< 10 years from purchase)", () => {
    const result = calculateExitStrategy({
      ...baseParams,
      purchaseDate: "2022-01-01", // 4 years ago, selling in 5 = 9 years total < 10
      saleInYears: 5,
    });
    expect(result.speculationTaxFree).toBe(false);
    expect(result.speculationTaxAmount).toBeGreaterThan(0);
  });

  it("should detect tax-free sale after speculation period (>= 10 years)", () => {
    const result = calculateExitStrategy({
      ...baseParams,
      purchaseDate: "2015-01-01", // 11 years ago
      saleInYears: 1,
    });
    expect(result.speculationTaxFree).toBe(true);
    expect(result.speculationTaxAmount).toBe(0);
    expect(result.taxableGain).toBe(0);
  });

  it("should calculate gross proceeds correctly", () => {
    const result = calculateExitStrategy(baseParams);
    // grossProceeds = salePrice - remainingBalanceAtSale - brokerFee
    expect(result.grossProceeds).toBe(
      result.projectedSalePrice -
        result.remainingBalanceAtSale -
        result.brokerFee,
    );
  });

  it("should calculate net proceeds after speculation tax", () => {
    const result = calculateExitStrategy({
      ...baseParams,
      purchaseDate: "2022-01-01",
      saleInYears: 5,
    });
    expect(result.netProceeds).toBe(
      result.grossProceeds - result.speculationTaxAmount,
    );
  });

  it("should project remaining balance decrease over time", () => {
    const result = calculateExitStrategy(baseParams);
    expect(result.remainingBalanceAtSale).toBeLessThan(
      baseParams.remainingLoanBalance,
    );
  });

  it("should generate timeline with correct dates", () => {
    const result = calculateExitStrategy(baseParams);
    expect(result.timeline.purchaseDate).toBe("2020-01-15");
    expect(result.timeline.speculationEndDate).toBe("2030-01-15");
    // Sale date should be ~5 years from now
    const expectedSaleYear = new Date().getFullYear() + 5;
    expect(result.timeline.saleDate).toContain(String(expectedSaleYear));
  });

  it("should generate per-year chart data", () => {
    const result = calculateExitStrategy(baseParams);
    expect(result.perYear).toHaveLength(5); // saleInYears = 5
    // Property value should increase over time
    for (let i = 1; i < result.perYear.length; i++) {
      expect(result.perYear[i].projectedValue).toBeGreaterThan(
        result.perYear[i - 1].projectedValue,
      );
    }
    // Remaining balance should decrease over time
    for (let i = 1; i < result.perYear.length; i++) {
      expect(result.perYear[i].remainingBalance).toBeLessThanOrEqual(
        result.perYear[i - 1].remainingBalance,
      );
    }
  });

  it("should calculate total appreciation", () => {
    const result = calculateExitStrategy(baseParams);
    expect(result.totalAppreciation).toBe(
      result.projectedSalePrice - baseParams.currentMarketValue,
    );
  });

  it("should handle sale with zero loan balance", () => {
    const result = calculateExitStrategy({
      ...baseParams,
      remainingLoanBalance: 0,
      monthlyLoanPayment: 0,
      loanInterestRate: 0,
    });
    expect(result.remainingBalanceAtSale).toBe(0);
    expect(result.grossProceeds).toBe(
      result.projectedSalePrice - result.brokerFee,
    );
  });
});
