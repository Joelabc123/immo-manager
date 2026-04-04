/**
 * Exit Strategy & Speculation Tax Calculator.
 * Computes projected sale proceeds with German 10-year speculation tax check.
 * NO VFE (Vorfaelligkeitsentschaedigung) considered.
 * All monetary values in cents, rates in basis points.
 */

export interface ExitStrategyParams {
  /** Original purchase price in cents */
  purchasePrice: number;
  /** Purchase date as ISO string (YYYY-MM-DD) */
  purchaseDate: string;
  /** Current market value in cents */
  currentMarketValue: number;
  /** Annual appreciation rate in basis points (e.g. 200 = 2%) */
  annualAppreciation: number;
  /** Planned sale in X years from now */
  saleInYears: number;
  /** Broker fee rate in basis points (e.g. 357 = 3.57%) */
  brokerFeeRate: number;
  /** Current remaining loan balance in cents */
  remainingLoanBalance: number;
  /** Monthly loan payment in cents (for projecting balance at sale time) */
  monthlyLoanPayment: number;
  /** Annual loan interest rate in basis points */
  loanInterestRate: number;
  /** Personal income tax rate in basis points (e.g. 4200 = 42%) */
  personalTaxRate: number;
  /** Total depreciation (AfA) claimed since purchase in cents */
  depreciationClaimed: number;
}

export interface ExitStrategyTimeline {
  /** Purchase date as ISO string */
  purchaseDate: string;
  /** Date when speculation period ends (10 years after purchase) */
  speculationEndDate: string;
  /** Projected sale date as ISO string */
  saleDate: string;
}

export interface ExitStrategyYearlyEntry {
  year: number;
  /** Projected property value in cents */
  projectedValue: number;
  /** Projected remaining loan balance in cents */
  remainingBalance: number;
  /** Net equity (value - balance) in cents */
  netEquity: number;
}

export interface ExitStrategyResult {
  /** Projected sale price in cents */
  projectedSalePrice: number;
  /** Broker fee in cents */
  brokerFee: number;
  /** Whether the sale is outside the 10-year speculation period */
  speculationTaxFree: boolean;
  /** Taxable gain for speculation tax in cents (0 if tax-free) */
  taxableGain: number;
  /** Speculation tax amount in cents (0 if tax-free) */
  speculationTaxAmount: number;
  /** Projected remaining loan balance at sale time in cents */
  remainingBalanceAtSale: number;
  /** Gross proceeds: salePrice - remainingBalance - brokerFee in cents */
  grossProceeds: number;
  /** Net proceeds: grossProceeds - speculationTax in cents */
  netProceeds: number;
  /** Total appreciation: salePrice - currentMarketValue in cents */
  totalAppreciation: number;
  /** Timeline visualization data */
  timeline: ExitStrategyTimeline;
  /** Per-year projection data for chart */
  perYear: ExitStrategyYearlyEntry[];
}

/**
 * Calculates exit strategy with speculation tax check.
 */
export function calculateExitStrategy(
  params: ExitStrategyParams,
): ExitStrategyResult {
  const {
    purchasePrice,
    purchaseDate,
    currentMarketValue,
    annualAppreciation,
    saleInYears,
    brokerFeeRate,
    remainingLoanBalance,
    monthlyLoanPayment,
    loanInterestRate,
    personalTaxRate,
    depreciationClaimed,
  } = params;

  // Projected sale price: current market value compounded
  const growthRate = annualAppreciation / 10000;
  const projectedSalePrice = Math.round(
    currentMarketValue * Math.pow(1 + growthRate, saleInYears),
  );

  // Broker fee
  const brokerFee = Math.round(projectedSalePrice * (brokerFeeRate / 10000));

  // Timeline
  const purchaseDateObj = new Date(purchaseDate);
  const speculationEndDate = new Date(purchaseDateObj);
  speculationEndDate.setFullYear(speculationEndDate.getFullYear() + 10);

  const saleDate = new Date();
  saleDate.setFullYear(saleDate.getFullYear() + saleInYears);

  const speculationTaxFree = saleDate >= speculationEndDate;

  // Remaining balance at sale time: simulate loan paydown
  const remainingBalanceAtSale = projectRemainingBalance(
    remainingLoanBalance,
    loanInterestRate,
    monthlyLoanPayment,
    saleInYears * 12,
  );

  // Speculation tax calculation
  // Taxable gain = sale price - purchase price - broker fee - depreciation recapture
  // In Germany, depreciation claimed is added back (recaptured) to the taxable gain
  let taxableGain = 0;
  let speculationTaxAmount = 0;

  if (!speculationTaxFree) {
    taxableGain = Math.max(
      0,
      projectedSalePrice - purchasePrice - brokerFee + depreciationClaimed,
    );
    speculationTaxAmount = Math.round(taxableGain * (personalTaxRate / 10000));
  }

  // Proceeds calculation
  const grossProceeds = projectedSalePrice - remainingBalanceAtSale - brokerFee;
  const netProceeds = grossProceeds - speculationTaxAmount;
  const totalAppreciation = projectedSalePrice - currentMarketValue;

  // Per-year projection
  const currentYear = new Date().getFullYear();
  const perYear: ExitStrategyYearlyEntry[] = [];

  for (let y = 1; y <= saleInYears; y++) {
    const projectedValue = Math.round(
      currentMarketValue * Math.pow(1 + growthRate, y),
    );
    const balance = projectRemainingBalance(
      remainingLoanBalance,
      loanInterestRate,
      monthlyLoanPayment,
      y * 12,
    );
    perYear.push({
      year: currentYear + y,
      projectedValue,
      remainingBalance: balance,
      netEquity: projectedValue - balance,
    });
  }

  return {
    projectedSalePrice,
    brokerFee,
    speculationTaxFree,
    taxableGain,
    speculationTaxAmount,
    remainingBalanceAtSale,
    grossProceeds,
    netProceeds,
    totalAppreciation,
    timeline: {
      purchaseDate,
      speculationEndDate: speculationEndDate.toISOString().split("T")[0],
      saleDate: saleDate.toISOString().split("T")[0],
    },
    perYear,
  };
}

/**
 * Projects the remaining loan balance after N months of payments.
 */
function projectRemainingBalance(
  currentBalance: number,
  annualRateBps: number,
  monthlyPayment: number,
  months: number,
): number {
  const monthlyRate = annualRateBps / 10000 / 12;
  let balance = currentBalance;

  for (let m = 0; m < months && balance > 0; m++) {
    const interest = Math.round(balance * monthlyRate);
    const principal = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principal);
  }

  return balance;
}
