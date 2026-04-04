interface CashflowParams {
  /** Total cold rent from all units in cents (monthly) */
  totalColdRent: number;
  /** Non-apportionable expenses in cents (monthly) */
  nonApportionableExpenses: number;
  /** Total monthly loan payments in cents */
  totalLoanPayments: number;
  /** Property tax in cents (monthly — annual / 12) */
  propertyTaxMonthly: number;
  /** Maintenance reserve in cents (monthly) */
  maintenanceReserve: number;
  /** Tax rate in basis points (e.g. 4200 = 42.00%). Defaults to 0. */
  taxRate?: number;
  /** Monthly depreciation (AfA) amount in cents for tax deduction. Defaults to 0. */
  monthlyDepreciation?: number;
}

export interface CashflowResult {
  /** Total cold rent in cents (monthly) */
  grossRent: number;
  /** Non-apportionable expenses in cents (monthly) */
  nonApportionableExpenses: number;
  /** Total loan payments in cents (monthly) */
  totalLoanPayments: number;
  /** Property tax in cents (monthly) */
  propertyTaxMonthly: number;
  /** Maintenance reserve in cents (monthly) */
  maintenanceReserve: number;
  /** Cashflow before tax in cents (monthly) */
  cashflowBeforeTax: number;
  /** Taxable income in cents (monthly, after AfA deduction) */
  taxableIncome: number;
  /** Tax amount in cents (monthly) */
  taxAmount: number;
  /** Cashflow after tax in cents (monthly) */
  cashflowAfterTax: number;
}

/**
 * Calculates monthly cashflow for a property.
 * All monetary values are in cents, rates in basis points.
 *
 * Formula:
 *   Cashflow before tax = coldRent - nonApportionableExpenses - loanPayments - propertyTax - reserve
 *   Taxable income = coldRent - nonApportionableExpenses - interestPortion - propertyTax - depreciation
 *   Tax = taxableIncome * taxRate (only if positive)
 *   Cashflow after tax = cashflowBeforeTax - tax
 *
 * Note: For simplicity, we approximate interest-only for tax (full loan payment minus principal).
 * In a real scenario, the interest portion would come from the amortization schedule.
 * Here we use the full loan payment for the before-tax calculation and
 * allow the caller to provide the depreciation separately.
 */
export function calculateMonthlyCashflow(
  params: CashflowParams,
): CashflowResult {
  const {
    totalColdRent,
    nonApportionableExpenses,
    totalLoanPayments,
    propertyTaxMonthly,
    maintenanceReserve,
    taxRate = 0,
    monthlyDepreciation = 0,
  } = params;

  const cashflowBeforeTax =
    totalColdRent -
    nonApportionableExpenses -
    totalLoanPayments -
    propertyTaxMonthly -
    maintenanceReserve;

  // Taxable income: rent minus deductible expenses minus depreciation
  // Loan payments include both interest (deductible) and principal (not deductible)
  // For simplicity, we use the full loan payment as deduction here
  // and add depreciation as an additional tax deduction
  const taxableIncome =
    totalColdRent -
    nonApportionableExpenses -
    totalLoanPayments -
    propertyTaxMonthly -
    monthlyDepreciation;

  const taxAmount =
    taxableIncome > 0 ? Math.round(taxableIncome * (taxRate / 10000)) : 0;

  const cashflowAfterTax = cashflowBeforeTax - taxAmount;

  return {
    grossRent: totalColdRent,
    nonApportionableExpenses,
    totalLoanPayments,
    propertyTaxMonthly,
    maintenanceReserve,
    cashflowBeforeTax,
    taxableIncome,
    taxAmount,
    cashflowAfterTax,
  };
}
