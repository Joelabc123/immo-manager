export const MARKET_DATA_TYPES = {
  interest_rate: "interest_rate",
  rent_benchmark: "rent_benchmark",
} as const;

export type MarketDataType =
  (typeof MARKET_DATA_TYPES)[keyof typeof MARKET_DATA_TYPES];

export interface InterestRateEntry {
  date: string;
  rateBasisPoints: number;
}

export interface InterestRateData {
  series: string;
  label: string;
  entries: InterestRateEntry[];
}

export interface RentBenchmarkData {
  rentPerSqmCents: number;
  validFrom: string;
  source: string;
}
