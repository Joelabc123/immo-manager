import { describe, it, expect } from "vitest";
import { evaluateActionCenterRules } from "../src/calculations/action-center-rules";

const BASE_INPUT = {
  properties: [],
  loans: [],
  tenants: [],
  rentalUnits: [],
  overduePayments: [],
  cashflows: [],
  dismissedRules: [],
  currentDate: "2025-06-15",
};

describe("evaluateActionCenterRules", () => {
  it("should return empty arrays when no data is provided", () => {
    const result = evaluateActionCenterRules(BASE_INPUT);

    expect(result.risks).toEqual([]);
    expect(result.opportunities).toEqual([]);
  });

  it("should detect vacancy risk for unoccupied units", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      rentalUnits: [
        {
          id: "unit-1",
          propertyId: "prop-1",
          propertyName: "Test Property",
          areaSqm: 80,
          hasTenant: false,
          monthlyRent: 80000, // 800 EUR estimate
        },
      ],
    });

    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].ruleType).toBe("vacancy");
    expect(result.risks[0].severity).toBe("risk");
    expect(result.risks[0].impactCents).toBe(960000); // 800 * 12
  });

  it("should detect negative cashflow risk", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      cashflows: [
        {
          propertyId: "prop-1",
          propertyName: "Loss Property",
          monthlyCashflow: -30000, // -300 EUR/month
        },
      ],
    });

    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].ruleType).toBe("negative_cashflow");
    expect(result.risks[0].impactCents).toBe(360000); // 300 * 12
  });

  it("should detect overdue rent payments", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      overduePayments: [
        {
          tenantId: "tenant-1",
          tenantName: "John Doe",
          propertyName: "Main Street 1",
          overdueAmount: 150000, // 1500 EUR
        },
      ],
    });

    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].ruleType).toBe("overdue_rent");
    expect(result.risks[0].entityType).toBe("tenant");
    expect(result.risks[0].impactCents).toBe(150000);
  });

  it("should detect interest binding expiry within 12 months", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      currentDate: "2025-06-15",
      loans: [
        {
          id: "loan-1",
          propertyId: "prop-1",
          propertyName: "Test Property",
          remainingBalance: 15000000, // 150k
          interestRate: 200, // 2%
          monthlyPayment: 80000,
          interestFixedUntil: "2026-01-15", // ~7 months away
          annualSpecialRepaymentLimit: null,
        },
      ],
    });

    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].ruleType).toBe("interest_binding_expiry");
    // Impact: 150k * 200bp / 10000 = 3000 EUR = 300000 cents
    expect(result.risks[0].impactCents).toBe(300000);
  });

  it("should NOT detect interest binding expiry beyond 12 months", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      currentDate: "2025-06-15",
      loans: [
        {
          id: "loan-1",
          propertyId: "prop-1",
          propertyName: "Test Property",
          remainingBalance: 15000000,
          interestRate: 200,
          monthlyPayment: 80000,
          interestFixedUntil: "2027-01-15", // >12 months away
          annualSpecialRepaymentLimit: null,
        },
      ],
    });

    expect(result.risks).toHaveLength(0);
  });

  it("should detect rent potential opportunity", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      rentalUnits: [
        {
          id: "unit-1",
          propertyId: "prop-1",
          propertyName: "Cheap Rental",
          areaSqm: 100,
          hasTenant: true,
          monthlyRent: 40000, // 400 EUR -> 4 EUR/sqm (below 6 benchmark)
        },
      ],
    });

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].ruleType).toBe("rent_potential");
    // Potential: (600 - 400) * 100 = 20000 cents/month * 12 = 240000 cents/year
    expect(result.opportunities[0].impactCents).toBe(240000);
  });

  it("should use per-property rent benchmark when provided", () => {
    const rentBenchmarks = new Map([["prop-1", 800]]); // 8 EUR/sqm
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      rentalUnits: [
        {
          id: "unit-1",
          propertyId: "prop-1",
          propertyName: "City Rental",
          areaSqm: 100,
          hasTenant: true,
          monthlyRent: 60000, // 600 EUR -> 6 EUR/sqm (below 8 benchmark but above default 6)
        },
      ],
      rentBenchmarks,
    });

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].ruleType).toBe("rent_potential");
    // Potential: (800 - 600) * 100 = 20000 cents/month * 12 = 240000 cents/year
    expect(result.opportunities[0].impactCents).toBe(240000);
    expect(result.opportunities[0].description).toContain("8.00 EUR/qm");
  });

  it("should detect special repayment opportunity", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      loans: [
        {
          id: "loan-1",
          propertyId: "prop-1",
          propertyName: "Financed Property",
          remainingBalance: 20000000, // 200k
          interestRate: 300, // 3%
          monthlyPayment: 100000,
          interestFixedUntil: null,
          annualSpecialRepaymentLimit: 1000000, // 10k/year
        },
      ],
    });

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].ruleType).toBe("special_repayment");
    // Interest saved: 10k * 3% = 300 EUR = 30000 cents
    expect(result.opportunities[0].impactCents).toBe(30000);
  });

  it("should respect dismissed rules", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      cashflows: [
        {
          propertyId: "prop-1",
          propertyName: "Loss Property",
          monthlyCashflow: -30000,
        },
      ],
      dismissedRules: [{ ruleType: "negative_cashflow", entityId: "prop-1" }],
    });

    expect(result.risks).toHaveLength(0);
  });

  it("should sort items by impact descending", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      cashflows: [
        {
          propertyId: "prop-1",
          propertyName: "Small Loss",
          monthlyCashflow: -10000, // 100 * 12 = 120k cents
        },
        {
          propertyId: "prop-2",
          propertyName: "Big Loss",
          monthlyCashflow: -50000, // 500 * 12 = 600k cents
        },
      ],
    });

    expect(result.risks).toHaveLength(2);
    expect(result.risks[0].impactCents).toBeGreaterThan(
      result.risks[1].impactCents,
    );
    expect(result.risks[0].propertyName).toBe("Big Loss");
  });

  it("should detect contract expiry within 3 months", () => {
    const result = evaluateActionCenterRules({
      ...BASE_INPUT,
      currentDate: "2025-06-15",
      tenants: [
        {
          id: "tenant-1",
          propertyName: "Main Property",
          firstName: "Max",
          lastName: "Mustermann",
          coldRent: 80000, // 800 EUR/month
          rentEnd: "2025-08-01", // ~1.5 months away
          rentalUnitId: "unit-1",
        },
      ],
    });

    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].ruleType).toBe("contract_expiry");
    // 3 months vacancy impact: 800 * 3 = 2400 EUR = 240000 cents
    expect(result.risks[0].impactCents).toBe(240000);
  });
});
