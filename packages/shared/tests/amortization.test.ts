import { describe, it, expect } from "vitest";
import {
  calculateAmortizationSchedule,
  aggregateYearlySummary,
} from "../src/calculations/amortization";

describe("calculateAmortizationSchedule", () => {
  it("should produce a schedule with decreasing remaining balance", () => {
    const schedule = calculateAmortizationSchedule({
      loanAmount: 20000000, // 200,000 EUR in cents
      interestRate: 300, // 3.00% in basis points
      monthlyPayment: 100000, // 1,000 EUR/mo in cents
      loanStart: "2024-01-01",
    });

    expect(schedule.length).toBeGreaterThan(0);

    // First entry is one month after loanStart (Feb for Jan start)
    const first = schedule[0];
    expect(first.month).toBe(2);
    expect(first.year).toBe(2024);
    expect(first.payment).toBe(100000);

    // Interest for first month: 200000 * 0.03 / 12 = 500 EUR = 50000 cents
    expect(first.interest).toBe(50000);
    expect(first.principal).toBe(50000); // 100000 - 50000
    expect(first.remainingBalance).toBe(19950000); // 20000000 - 50000

    // Balance should decrease
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].remainingBalance).toBeLessThan(
        schedule[i - 1].remainingBalance,
      );
    }

    // Last entry should have remaining balance of 0
    const last = schedule[schedule.length - 1];
    expect(last.remainingBalance).toBe(0);
  });

  it("should respect loanTermMonths", () => {
    const schedule = calculateAmortizationSchedule({
      loanAmount: 10000000, // 100,000 EUR
      interestRate: 200, // 2.00%
      monthlyPayment: 200000, // 2,000 EUR/mo
      loanStart: "2024-06-01",
      loanTermMonths: 12,
    });

    // Should have at most 12 entries
    expect(schedule.length).toBeLessThanOrEqual(12);
  });

  it("should accumulate cumulative values correctly", () => {
    const schedule = calculateAmortizationSchedule({
      loanAmount: 5000000,
      interestRate: 400,
      monthlyPayment: 100000,
      loanStart: "2024-01-01",
      loanTermMonths: 3,
    });

    // Cumulative values should increase
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].cumulativeInterest).toBeGreaterThan(
        schedule[i - 1].cumulativeInterest,
      );
      expect(schedule[i].cumulativePrincipal).toBeGreaterThan(
        schedule[i - 1].cumulativePrincipal,
      );
    }
  });
});

describe("aggregateYearlySummary", () => {
  it("should group schedule entries by year", () => {
    const schedule = calculateAmortizationSchedule({
      loanAmount: 10000000,
      interestRate: 300,
      monthlyPayment: 200000,
      loanStart: "2024-06-01",
      loanTermMonths: 18,
    });

    const yearly = aggregateYearlySummary(schedule);

    // Should have entries for 2024 and 2025
    expect(yearly.length).toBeGreaterThanOrEqual(2);
    expect(yearly[0].year).toBe(2024);
    expect(yearly[1].year).toBe(2025);

    // Each year's total should be sum of monthly entries
    const year2024Entries = schedule.filter((e) => e.year === 2024);
    const expectedPayments = year2024Entries.reduce((s, e) => s + e.payment, 0);
    expect(yearly[0].totalPayments).toBe(expectedPayments);
  });
});
