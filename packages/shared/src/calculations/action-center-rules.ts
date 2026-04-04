export const ACTION_CENTER_RULE_TYPES = {
  vacancy: "vacancy",
  negative_cashflow: "negative_cashflow",
  overdue_rent: "overdue_rent",
  interest_binding_expiry: "interest_binding_expiry",
  contract_expiry: "contract_expiry",
  rent_potential: "rent_potential",
  special_repayment: "special_repayment",
} as const;

export type ActionCenterRuleType =
  (typeof ACTION_CENTER_RULE_TYPES)[keyof typeof ACTION_CENTER_RULE_TYPES];

export type ActionCenterSeverity = "risk" | "opportunity";

export interface ActionCenterItem {
  /** Rule type identifier */
  ruleType: ActionCenterRuleType;
  /** Whether this is a risk or an opportunity */
  severity: ActionCenterSeverity;
  /** ID of the related entity (property, tenant, or loan) */
  entityId: string;
  /** Type of the related entity */
  entityType: "property" | "tenant" | "loan";
  /** Short title for the action item */
  title: string;
  /** Detailed description */
  description: string;
  /** Financial impact in cents (positive = potential gain/loss) */
  impactCents: number;
  /** Name of the related property for display */
  propertyName: string;
}

interface PropertyData {
  id: string;
  name: string;
  status: string;
  livingAreaSqm: number;
}

interface LoanData {
  id: string;
  propertyId: string;
  propertyName: string;
  remainingBalance: number;
  interestRate: number;
  monthlyPayment: number;
  interestFixedUntil: string | null;
  annualSpecialRepaymentLimit: number | null;
}

interface TenantData {
  id: string;
  propertyName: string;
  firstName: string;
  lastName: string;
  coldRent: number;
  rentEnd: string | null;
  rentalUnitId: string | null;
}

interface RentalUnitData {
  id: string;
  propertyId: string;
  propertyName: string;
  areaSqm: number | null;
  hasTenant: boolean;
  monthlyRent: number;
}

interface OverduePaymentData {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  overdueAmount: number;
}

interface CashflowData {
  propertyId: string;
  propertyName: string;
  monthlyCashflow: number;
}

interface ActionCenterInput {
  properties: PropertyData[];
  loans: LoanData[];
  tenants: TenantData[];
  rentalUnits: RentalUnitData[];
  overduePayments: OverduePaymentData[];
  cashflows: CashflowData[];
  dismissedRules: { ruleType: string; entityId: string | null }[];
  /** Current date as ISO string for expiry calculations */
  currentDate: string;
  /** Optional per-property rent benchmark in cents/sqm (from market data). Falls back to 600 (6 EUR/sqm). */
  rentBenchmarks?: Map<string, number>;
}

/**
 * Checks if a rule+entity combination has been dismissed by the user.
 */
function isDismissed(
  dismissedRules: { ruleType: string; entityId: string | null }[],
  ruleType: string,
  entityId: string,
): boolean {
  return dismissedRules.some(
    (d) =>
      d.ruleType === ruleType &&
      (d.entityId === entityId || d.entityId === null),
  );
}

/**
 * Evaluates vacancy risk: properties with vacant units.
 */
function evaluateVacancy(
  rentalUnits: RentalUnitData[],
  dismissedRules: ActionCenterInput["dismissedRules"],
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];

  for (const unit of rentalUnits) {
    if (unit.hasTenant) continue;
    if (isDismissed(dismissedRules, ACTION_CENTER_RULE_TYPES.vacancy, unit.id))
      continue;

    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.vacancy,
      severity: "risk",
      entityId: unit.id,
      entityType: "property",
      title: "Leerstand",
      description: `Mieteinheit in ${unit.propertyName} ist nicht vermietet.`,
      impactCents: unit.monthlyRent * 12,
      propertyName: unit.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates negative cashflow risk per property.
 */
function evaluateNegativeCashflow(
  cashflows: CashflowData[],
  dismissedRules: ActionCenterInput["dismissedRules"],
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];

  for (const cf of cashflows) {
    if (cf.monthlyCashflow >= 0) continue;
    if (
      isDismissed(
        dismissedRules,
        ACTION_CENTER_RULE_TYPES.negative_cashflow,
        cf.propertyId,
      )
    )
      continue;

    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.negative_cashflow,
      severity: "risk",
      entityId: cf.propertyId,
      entityType: "property",
      title: "Negativer Cashflow",
      description: `${cf.propertyName} hat einen negativen monatlichen Cashflow.`,
      impactCents: Math.abs(cf.monthlyCashflow) * 12,
      propertyName: cf.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates overdue rent payment risk.
 */
function evaluateOverdueRent(
  overduePayments: OverduePaymentData[],
  dismissedRules: ActionCenterInput["dismissedRules"],
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];

  for (const payment of overduePayments) {
    if (
      isDismissed(
        dismissedRules,
        ACTION_CENTER_RULE_TYPES.overdue_rent,
        payment.tenantId,
      )
    )
      continue;

    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.overdue_rent,
      severity: "risk",
      entityId: payment.tenantId,
      entityType: "tenant",
      title: "Mietrueckstand",
      description: `${payment.tenantName} hat ausstehende Mietzahlungen (${payment.propertyName}).`,
      impactCents: payment.overdueAmount,
      propertyName: payment.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates interest rate binding expiry risk (within 12 months).
 */
function evaluateInterestBindingExpiry(
  loans: LoanData[],
  currentDate: string,
  dismissedRules: ActionCenterInput["dismissedRules"],
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];
  const now = new Date(currentDate);
  const twelveMonthsLater = new Date(now);
  twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12);

  for (const loan of loans) {
    if (!loan.interestFixedUntil) continue;

    const expiryDate = new Date(loan.interestFixedUntil);
    if (expiryDate > twelveMonthsLater || expiryDate < now) continue;

    if (
      isDismissed(
        dismissedRules,
        ACTION_CENTER_RULE_TYPES.interest_binding_expiry,
        loan.id,
      )
    )
      continue;

    // Estimate impact: assume 2% rate increase on remaining balance
    const rateIncreaseBp = 200;
    const annualImpact = Math.round(
      (loan.remainingBalance * rateIncreaseBp) / 10000,
    );

    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.interest_binding_expiry,
      severity: "risk",
      entityId: loan.id,
      entityType: "loan",
      title: "Zinsbindung laeuft aus",
      description: `Kredit fuer ${loan.propertyName} — Zinsbindung endet am ${loan.interestFixedUntil}.`,
      impactCents: annualImpact,
      propertyName: loan.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates contract expiry risk (tenant leases ending within 3 months).
 */
function evaluateContractExpiry(
  tenants: TenantData[],
  currentDate: string,
  dismissedRules: ActionCenterInput["dismissedRules"],
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];
  const now = new Date(currentDate);
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  for (const tenant of tenants) {
    if (!tenant.rentEnd) continue;

    const endDate = new Date(tenant.rentEnd);
    if (endDate > threeMonthsLater || endDate < now) continue;

    if (
      isDismissed(
        dismissedRules,
        ACTION_CENTER_RULE_TYPES.contract_expiry,
        tenant.id,
      )
    )
      continue;

    // Impact: potential 3 months vacancy
    const impactCents = tenant.coldRent * 3;

    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.contract_expiry,
      severity: "risk",
      entityId: tenant.id,
      entityType: "tenant",
      title: "Mietvertrag endet bald",
      description: `Vertrag von ${tenant.firstName} ${tenant.lastName} endet am ${tenant.rentEnd} (${tenant.propertyName}).`,
      impactCents,
      propertyName: tenant.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates rent potential opportunity (rent below 600 cents/sqm = 6 EUR/sqm).
 */
const DEFAULT_BENCHMARK_CENTS_PER_SQM = 600; // 6.00 EUR/sqm

function evaluateRentPotential(
  rentalUnits: RentalUnitData[],
  dismissedRules: ActionCenterInput["dismissedRules"],
  rentBenchmarks?: Map<string, number>,
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];

  for (const unit of rentalUnits) {
    if (!unit.hasTenant || !unit.areaSqm || unit.areaSqm <= 0) continue;
    if (unit.monthlyRent <= 0) continue;

    const benchmarkCentsPerSqm =
      rentBenchmarks?.get(unit.propertyId) ?? DEFAULT_BENCHMARK_CENTS_PER_SQM;

    const currentRentPerSqm = unit.monthlyRent / unit.areaSqm;
    if (currentRentPerSqm >= benchmarkCentsPerSqm) continue;

    if (
      isDismissed(
        dismissedRules,
        ACTION_CENTER_RULE_TYPES.rent_potential,
        unit.id,
      )
    )
      continue;

    const potentialIncrease =
      (benchmarkCentsPerSqm - currentRentPerSqm) * unit.areaSqm;

    const benchmarkEur = (benchmarkCentsPerSqm / 100).toFixed(2);
    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.rent_potential,
      severity: "opportunity",
      entityId: unit.id,
      entityType: "property",
      title: "Mietpotenzial",
      description: `Miete in ${unit.propertyName} liegt unter dem Richtwert von ${benchmarkEur} EUR/qm.`,
      impactCents: Math.round(potentialIncrease * 12),
      propertyName: unit.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates special repayment opportunity.
 */
function evaluateSpecialRepayment(
  loans: LoanData[],
  dismissedRules: ActionCenterInput["dismissedRules"],
): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];

  for (const loan of loans) {
    if (
      !loan.annualSpecialRepaymentLimit ||
      loan.annualSpecialRepaymentLimit <= 0
    )
      continue;
    if (loan.remainingBalance <= 0) continue;

    if (
      isDismissed(
        dismissedRules,
        ACTION_CENTER_RULE_TYPES.special_repayment,
        loan.id,
      )
    )
      continue;

    // Estimate interest savings from special repayment
    const interestSavings = Math.round(
      (loan.annualSpecialRepaymentLimit * loan.interestRate) / 10000,
    );

    items.push({
      ruleType: ACTION_CENTER_RULE_TYPES.special_repayment,
      severity: "opportunity",
      entityId: loan.id,
      entityType: "loan",
      title: "Sondertilgung moeglich",
      description: `Kredit fuer ${loan.propertyName} erlaubt Sondertilgung bis ${loan.annualSpecialRepaymentLimit / 100} EUR/Jahr.`,
      impactCents: interestSavings,
      propertyName: loan.propertyName,
    });
  }

  return items;
}

/**
 * Evaluates all action center rules against the provided data.
 * Rules are pure functions — no database access.
 * Returns items sorted by impact (highest first) within each severity category.
 */
export function evaluateActionCenterRules(input: ActionCenterInput): {
  risks: ActionCenterItem[];
  opportunities: ActionCenterItem[];
} {
  const allItems: ActionCenterItem[] = [
    ...evaluateVacancy(input.rentalUnits, input.dismissedRules),
    ...evaluateNegativeCashflow(input.cashflows, input.dismissedRules),
    ...evaluateOverdueRent(input.overduePayments, input.dismissedRules),
    ...evaluateInterestBindingExpiry(
      input.loans,
      input.currentDate,
      input.dismissedRules,
    ),
    ...evaluateContractExpiry(
      input.tenants,
      input.currentDate,
      input.dismissedRules,
    ),
    ...evaluateRentPotential(
      input.rentalUnits,
      input.dismissedRules,
      input.rentBenchmarks,
    ),
    ...evaluateSpecialRepayment(input.loans, input.dismissedRules),
  ];

  const risks = allItems
    .filter((item) => item.severity === "risk")
    .sort((a, b) => b.impactCents - a.impactCents);

  const opportunities = allItems
    .filter((item) => item.severity === "opportunity")
    .sort((a, b) => b.impactCents - a.impactCents);

  return { risks, opportunities };
}
