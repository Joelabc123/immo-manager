import { describe, expect, it } from "vitest";
import {
  calculateUtilityDueDate,
  evaluateTerminationWarning,
  getThirdBusinessDayOfMonth,
  isLatePaymentPattern,
} from "../src/calculations/dunning";

describe("dunning calculations", () => {
  it("calculates the third German business day with federal holidays", () => {
    expect(getThirdBusinessDayOfMonth(2025, 1, "NW")).toBe("2025-01-06");
  });

  it("calculates utility due dates from invoice dates", () => {
    expect(calculateUtilityDueDate("2026-04-01")).toBe("2026-05-01");
  });

  it("detects termination warning thresholds for consecutive arrears", () => {
    const result = evaluateTerminationWarning(
      [
        { dueDate: "2026-03-01", expectedAmount: 80000, paidAmount: 0 },
        { dueDate: "2026-04-01", expectedAmount: 80000, paidAmount: 0 },
      ],
      80000,
    );

    expect(result.shouldWarn).toBe(true);
    expect(result.consecutiveTermsInArrears).toBe(2);
    expect(result.totalArrears).toBe(160000);
  });

  it("detects repeated late payment patterns inside the configured window", () => {
    expect(
      isLatePaymentPattern(
        ["2026-01-03", "2026-03-04"],
        2,
        6,
        new Date("2026-05-01T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
