import { describe, it, expect } from "vitest";
import { calculateHealthScore } from "../src/calculations/health-score";

describe("calculateHealthScore", () => {
  it("should return perfect score for profitable, debt-free portfolio", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: 200000, // 2000 EUR/month
      totalMarketValue: 50000000, // 500k
      totalRemainingBalance: 0,
      totalAnnualRent: 3000000, // 30k/year
      totalPurchasePrice: 30000000, // 300k -> 10% yield
      weights: { cashflow: 34, ltv: 33, yield: 33 },
    });

    expect(result.score).toBe(100);
    expect(result.cashflowScore).toBe(100);
    expect(result.ltvScore).toBe(100);
    expect(result.yieldScore).toBe(100);
  });

  it("should return 50 cashflow score for zero cashflow", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: 0,
      totalMarketValue: 30000000,
      totalRemainingBalance: 0,
      totalAnnualRent: 1500000,
      totalPurchasePrice: 30000000,
      weights: { cashflow: 100, ltv: 0, yield: 0 },
    });

    expect(result.cashflowScore).toBe(50);
    expect(result.score).toBe(50);
  });

  it("should return 0 cashflow score for very negative cashflow", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: -200000, // -2000 EUR/month
      totalMarketValue: 30000000,
      totalRemainingBalance: 15000000,
      totalAnnualRent: 600000,
      totalPurchasePrice: 30000000,
      weights: { cashflow: 34, ltv: 33, yield: 33 },
    });

    expect(result.cashflowScore).toBe(0);
  });

  it("should return low LTV score for highly leveraged portfolio", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: 50000,
      totalMarketValue: 30000000,
      totalRemainingBalance: 27000000, // 90% LTV
      totalAnnualRent: 1800000,
      totalPurchasePrice: 30000000,
      weights: { cashflow: 0, ltv: 100, yield: 0 },
    });

    // LTV 90% -> score = max(0, 100 - 90*1.25) = max(0, -12.5) = 0
    expect(result.ltvScore).toBe(0);
    expect(result.score).toBe(0);
  });

  it("should handle custom weight distributions", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: 100000, // 1000 EUR -> cashflow=100
      totalMarketValue: 50000000,
      totalRemainingBalance: 0, // LTV 0% -> ltv=100
      totalAnnualRent: 0, // yield 0% -> yield=0
      totalPurchasePrice: 50000000,
      weights: { cashflow: 50, ltv: 50, yield: 0 },
    });

    expect(result.cashflowScore).toBe(100);
    expect(result.ltvScore).toBe(100);
    expect(result.yieldScore).toBe(0);
    // Score should only consider cashflow and ltv
    expect(result.score).toBe(100);
  });

  it("should handle zero weights gracefully (equal distribution)", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: 0, // cashflow=50
      totalMarketValue: 30000000,
      totalRemainingBalance: 0, // ltv=100
      totalAnnualRent: 1500000, // yield=5% -> 50
      totalPurchasePrice: 30000000,
      weights: { cashflow: 0, ltv: 0, yield: 0 },
    });

    // Should fall back to equal weights: (50+100+50)/3 = 67
    expect(result.score).toBe(67);
  });

  it("should handle empty portfolio (zero values)", () => {
    const result = calculateHealthScore({
      totalMonthlyCashflow: 0,
      totalMarketValue: 0,
      totalRemainingBalance: 0,
      totalAnnualRent: 0,
      totalPurchasePrice: 0,
      weights: { cashflow: 34, ltv: 33, yield: 33 },
    });

    // cashflow=50, ltv=100 (no debt no value), yield=0
    expect(result.cashflowScore).toBe(50);
    expect(result.ltvScore).toBe(100);
    expect(result.yieldScore).toBe(0);
  });
});
