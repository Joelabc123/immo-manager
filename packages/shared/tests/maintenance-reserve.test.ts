import { describe, it, expect } from "vitest";
import {
  calculateRecommendedReserve,
  calculateReserveBalance,
} from "../src/calculations/maintenance-reserve";

describe("calculateRecommendedReserve", () => {
  it("should return higher reserve for older buildings", () => {
    const oldBuilding = calculateRecommendedReserve(1940, 100);
    const newBuilding = calculateRecommendedReserve(2020, 100);

    expect(oldBuilding).toBeGreaterThan(newBuilding);
  });

  it("should return correct rate for pre-1950 building", () => {
    // 150 cents/sqm/month for pre-1950
    const reserve = calculateRecommendedReserve(1945, 80);
    expect(reserve).toBe(150 * 80);
  });

  it("should return correct rate for 1950-1979 building", () => {
    const reserve = calculateRecommendedReserve(1965, 100);
    expect(reserve).toBe(120 * 100);
  });

  it("should return correct rate for 1980-1999 building", () => {
    const reserve = calculateRecommendedReserve(1990, 100);
    expect(reserve).toBe(90 * 100);
  });

  it("should return correct rate for 2000-2014 building", () => {
    const reserve = calculateRecommendedReserve(2010, 100);
    expect(reserve).toBe(70 * 100);
  });

  it("should return correct rate for post-2015 building", () => {
    const reserve = calculateRecommendedReserve(2020, 100);
    expect(reserve).toBe(50 * 100);
  });

  it("should scale with area", () => {
    const small = calculateRecommendedReserve(2000, 50);
    const large = calculateRecommendedReserve(2000, 200);
    expect(large).toBe(small * 4);
  });
});

describe("calculateReserveBalance", () => {
  it("should calculate balance correctly", () => {
    const balance = calculateReserveBalance(
      10000, // 100 EUR/mo contribution
      12, // 12 months
      50000, // 500 EUR total maintenance spent
    );

    // 10000 * 12 - 50000 = 70000
    expect(balance).toBe(70000);
  });

  it("should return negative balance when expenses exceed contributions", () => {
    const balance = calculateReserveBalance(5000, 6, 100000);
    // 5000 * 6 - 100000 = -70000
    expect(balance).toBe(-70000);
  });

  it("should return zero when balanced", () => {
    const balance = calculateReserveBalance(10000, 10, 100000);
    expect(balance).toBe(0);
  });
});
