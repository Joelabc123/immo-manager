import { describe, it, expect } from "vitest";
import { calculateWealthForecast } from "../src/calculations/wealth-forecast";

describe("calculateWealthForecast", () => {
  it("should return empty array for no properties", () => {
    const result = calculateWealthForecast({
      properties: [],
      growthRate: 200,
      inflationRate: 200,
      rentGrowthRate: 150,
      timeHorizonYears: 10,
    });

    expect(result).toEqual([]);
  });

  it("should return empty array for zero time horizon", () => {
    const result = calculateWealthForecast({
      properties: [
        {
          marketValue: 30000000,
          loans: [],
          monthlyRent: 100000,
          monthlyExpenses: 20000,
        },
      ],
      growthRate: 200,
      inflationRate: 200,
      rentGrowthRate: 150,
      timeHorizonYears: 0,
    });

    expect(result).toEqual([]);
  });

  it("should include year 0 as current state", () => {
    const result = calculateWealthForecast({
      properties: [
        {
          marketValue: 30000000, // 300k
          loans: [],
          monthlyRent: 100000, // 1k/month
          monthlyExpenses: 20000, // 200/month
        },
      ],
      growthRate: 200,
      inflationRate: 200,
      rentGrowthRate: 150,
      timeHorizonYears: 1,
    });

    expect(result.length).toBe(2); // year 0 + year 1
    expect(result[0].year).toBe(0);
    expect(result[0].marketValue).toBe(30000000);
    expect(result[0].remainingBalance).toBe(0);
    expect(result[0].netWealth).toBe(30000000);
    expect(result[0].annualRent).toBe(1200000); // 100k * 12
    expect(result[0].annualCashflow).toBe(960000); // 1.2M - 240k
  });

  it("should compound market value at growth rate", () => {
    const result = calculateWealthForecast({
      properties: [
        {
          marketValue: 10000000, // 100k
          loans: [],
          monthlyRent: 0,
          monthlyExpenses: 0,
        },
      ],
      growthRate: 500, // 5%
      inflationRate: 0,
      rentGrowthRate: 0,
      timeHorizonYears: 2,
    });

    expect(result[0].marketValue).toBe(10000000);
    // Year 1: 100k * 1.05 = 105k
    expect(result[1].marketValue).toBe(10500000);
    // Year 2: 100k * 1.05^2 = 110250
    expect(result[2].marketValue).toBe(11025000);
  });

  it("should grow rent at rent growth rate", () => {
    const result = calculateWealthForecast({
      properties: [
        {
          marketValue: 20000000,
          loans: [],
          monthlyRent: 100000, // 1000 EUR/month
          monthlyExpenses: 0,
        },
      ],
      growthRate: 0,
      inflationRate: 0,
      rentGrowthRate: 1000, // 10%
      timeHorizonYears: 1,
    });

    // Year 0: annual rent = 12 * 100000 = 1200000
    expect(result[0].annualRent).toBe(1200000);
    // Year 1: 1200000 * 1.10 = 1320000
    expect(result[1].annualRent).toBe(1320000);
  });

  it("should reduce loan balance via amortization", () => {
    const result = calculateWealthForecast({
      properties: [
        {
          marketValue: 30000000,
          loans: [
            {
              remainingBalance: 20000000, // 200k
              interestRate: 300, // 3%
              monthlyPayment: 100000, // 1k/month
            },
          ],
          monthlyRent: 120000,
          monthlyExpenses: 10000,
        },
      ],
      growthRate: 0,
      inflationRate: 0,
      rentGrowthRate: 0,
      timeHorizonYears: 2,
    });

    // Year 0 remaining balance = 200k
    expect(result[0].remainingBalance).toBe(20000000);
    // After 1 year of payments, balance should be lower
    expect(result[1].remainingBalance).toBeLessThan(20000000);
    // After 2 years, even lower
    expect(result[2].remainingBalance).toBeLessThan(result[1].remainingBalance);
    // Net wealth = marketValue - remainingBalance
    expect(result[1].netWealth).toBe(
      result[1].marketValue - result[1].remainingBalance,
    );
  });

  it("should handle multiple properties", () => {
    const result = calculateWealthForecast({
      properties: [
        {
          marketValue: 20000000,
          loans: [],
          monthlyRent: 80000,
          monthlyExpenses: 10000,
        },
        {
          marketValue: 30000000,
          loans: [],
          monthlyRent: 120000,
          monthlyExpenses: 20000,
        },
      ],
      growthRate: 0,
      inflationRate: 0,
      rentGrowthRate: 0,
      timeHorizonYears: 1,
    });

    // Year 0: total market value = 200k + 300k = 500k
    expect(result[0].marketValue).toBe(50000000);
    // Total annual rent = (80k + 120k) * 12 = 2.4M
    expect(result[0].annualRent).toBe(2400000);
    // Total annual expenses = (10k + 20k) * 12 = 360k
    // Cashflow = 2.4M - 360k = 2.04M
    expect(result[0].annualCashflow).toBe(2040000);
  });
});
