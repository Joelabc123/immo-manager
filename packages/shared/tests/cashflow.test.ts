import { describe, it, expect } from "vitest";
import { calculateMonthlyCashflow } from "../src/calculations/cashflow";

describe("calculateMonthlyCashflow", () => {
  it("should calculate positive cashflow correctly", () => {
    const result = calculateMonthlyCashflow({
      totalColdRent: 150000, // 1,500 EUR
      nonApportionableExpenses: 20000, // 200 EUR
      totalLoanPayments: 80000, // 800 EUR
      propertyTaxMonthly: 5000, // 50 EUR
      maintenanceReserve: 10000, // 100 EUR
    });

    // cashflow = 150000 - 20000 - 80000 - 5000 - 10000 = 35000
    expect(result.cashflowBeforeTax).toBe(35000);
    expect(result.cashflowBeforeTax).toBeGreaterThan(0);
  });

  it("should calculate negative cashflow", () => {
    const result = calculateMonthlyCashflow({
      totalColdRent: 50000,
      nonApportionableExpenses: 30000,
      totalLoanPayments: 80000,
      propertyTaxMonthly: 5000,
      maintenanceReserve: 10000,
    });

    // cashflow = 50000 - 30000 - 80000 - 5000 - 10000 = -75000
    expect(result.cashflowBeforeTax).toBe(-75000);
    expect(result.cashflowBeforeTax).toBeLessThan(0);
  });

  it("should compute tax only on positive taxable income", () => {
    const result = calculateMonthlyCashflow({
      totalColdRent: 200000,
      nonApportionableExpenses: 10000,
      totalLoanPayments: 50000,
      propertyTaxMonthly: 5000,
      maintenanceReserve: 5000,
      taxRate: 4200, // 42% in basis points
      monthlyDepreciation: 20000,
    });

    // taxableIncome = 200000 - 10000 - 50000 - 5000 - 20000 = 115000
    // taxAmount = 115000 * 0.42 = 48300
    expect(result.taxableIncome).toBe(115000);
    expect(result.taxAmount).toBe(48300);
    // cashflowBeforeTax = 200000 - 10000 - 50000 - 5000 - 5000 = 130000
    expect(result.cashflowBeforeTax).toBe(130000);
    expect(result.cashflowAfterTax).toBe(130000 - 48300);
  });

  it("should not charge tax when taxable income is negative", () => {
    const result = calculateMonthlyCashflow({
      totalColdRent: 50000,
      nonApportionableExpenses: 40000,
      totalLoanPayments: 30000,
      propertyTaxMonthly: 5000,
      maintenanceReserve: 5000,
      taxRate: 4200,
      monthlyDepreciation: 10000,
    });

    // taxableIncome = 50000 - 40000 - 30000 - 5000 - 10000 = -35000 (negative)
    expect(result.taxAmount).toBe(0);
    expect(result.cashflowAfterTax).toBe(result.cashflowBeforeTax);
  });

  it("should use default zero values for optional params", () => {
    const result = calculateMonthlyCashflow({
      totalColdRent: 100000,
      nonApportionableExpenses: 0,
      totalLoanPayments: 0,
      propertyTaxMonthly: 0,
      maintenanceReserve: 0,
    });

    expect(result.cashflowBeforeTax).toBe(100000);
    expect(result.taxAmount).toBe(0);
  });
});
