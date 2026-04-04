import { z } from "zod";

export const stressTestInput = z.object({
  /** Scenario interest rate in basis points (0 = 0%, 1500 = 15%) */
  scenarioRate: z.number().int().min(0).max(1500),
});

export const specialRepaymentInput = z.object({
  /** Loan ID to analyze */
  loanId: z.string().uuid(),
  /** Annual special repayment amount in cents */
  annualSpecialRepayment: z.number().int().min(0),
  /** Projected refinance rate in basis points */
  projectedRefinanceRate: z.number().int().min(0).max(1500).default(400),
  /** Expected annual ETF return rate in basis points (default: 700 = 7%) */
  etfReturnRate: z.number().int().min(0).max(5000).default(700),
  /** Capital gains tax rate in basis points (default: 2500 = 25%) */
  capitalGainsTaxRate: z.number().int().min(0).max(10000).default(2500),
});

export const refinancingInput = z.object({
  /** New annual interest rate in basis points */
  newInterestRate: z.number().int().min(0).max(1500),
  /** Fixed refinancing costs in cents (notary, land registry) */
  refinanceCosts: z.number().int().min(0),
});

export const exitStrategyInput = z.object({
  /** Planned sale in X years from now */
  saleInYears: z.number().int().min(1).max(50).default(10),
  /** Annual appreciation rate in basis points */
  annualAppreciation: z.number().int().min(0).max(2000).default(200),
  /** Broker fee rate in basis points */
  brokerFeeRate: z.number().int().min(0).max(1000).default(357),
  /** Personal income tax rate in basis points */
  personalTaxRate: z.number().int().min(0).max(5000).default(4200),
});

export type StressTestInput = z.infer<typeof stressTestInput>;
export type SpecialRepaymentInput = z.infer<typeof specialRepaymentInput>;
export type RefinancingInput = z.infer<typeof refinancingInput>;
export type ExitStrategyInput = z.infer<typeof exitStrategyInput>;
