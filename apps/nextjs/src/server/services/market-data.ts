import { db } from "@repo/shared/db";
import { marketDataCache } from "@repo/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { MARKET_DATA_TYPES } from "@repo/shared/types";
import type { InterestRateData, InterestRateEntry } from "@repo/shared/types";
import { logger } from "@/lib/logger";

const ECB_DATA_API = "https://data-api.ecb.europa.eu/service/data";

// ECB key interest rate (Main refinancing operations)
const ECB_KEY_RATE_SERIES = "FM.D.U2.EUR.4F.KR.MRR_FR.LEV";
// Household mortgage rates (new business)
const ECB_MORTGAGE_RATE_SERIES = "MIR.M.U2.B.A2C.AM.R.A.2250.EUR.N";

interface EcbObservation {
  date: string;
  value: number;
}

/**
 * Parse ECB SDMX-JSON response into a list of date/value pairs.
 */
function parseEcbResponse(data: unknown): EcbObservation[] {
  const observations: EcbObservation[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = data as any;
    const dataSets = json?.dataSets;
    const structure = json?.structure;

    if (!dataSets?.[0]?.series || !structure?.dimensions?.observation) {
      return observations;
    }

    const series = dataSets[0].series;
    const timeDimension = structure.dimensions.observation.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any) => d.id === "TIME_PERIOD",
    );

    if (!timeDimension?.values) return observations;

    // Get first series key
    const seriesKeys = Object.keys(series);
    if (seriesKeys.length === 0) return observations;

    const firstSeries = series[seriesKeys[0]];
    const obs = firstSeries?.observations;
    if (!obs) return observations;

    for (const [index, values] of Object.entries(obs)) {
      const timeValue = timeDimension.values[Number(index)];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obsValue = (values as any)?.[0];

      if (timeValue?.id && obsValue != null) {
        observations.push({
          date: timeValue.id,
          value: Number(obsValue),
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to parse ECB response");
  }

  return observations;
}

/**
 * Fetch interest rate data from the ECB Statistical Data Warehouse.
 */
async function fetchEcbSeries(
  seriesKey: string,
  label: string,
  lastNMonths: number = 36,
): Promise<InterestRateData | null> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(
    Date.now() - lastNMonths * 30 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];

  // ECB API expects flowRef/key format (e.g. FM/D.U2.EUR.4F.KR.MRR_FR.LEV)
  const dotIndex = seriesKey.indexOf(".");
  const flowRef = seriesKey.substring(0, dotIndex);
  const key = seriesKey.substring(dotIndex + 1);

  const url = `${ECB_DATA_API}/${flowRef}/${key}?startPeriod=${startDate}&endPeriod=${endDate}&format=jsondata`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, seriesKey },
        "ECB API returned non-OK status",
      );
      return null;
    }

    const data = await response.json();
    const observations = parseEcbResponse(data);

    if (observations.length === 0) {
      logger.warn({ seriesKey }, "No observations found in ECB response");
      return null;
    }

    const entries: InterestRateEntry[] = observations.map((obs) => ({
      date: obs.date,
      rateBasisPoints: Math.round(obs.value * 100),
    }));

    return { series: seriesKey, label, entries };
  } catch (err) {
    logger.error({ err, seriesKey }, "Failed to fetch ECB data");
    return null;
  }
}

/**
 * Fetch ECB interest rates and store in market_data_cache.
 */
export async function syncEcbInterestRates(): Promise<{
  keyRate: boolean;
  mortgageRate: boolean;
}> {
  const results = { keyRate: false, mortgageRate: false };

  const [keyRateData, mortgageRateData] = await Promise.all([
    fetchEcbSeries(ECB_KEY_RATE_SERIES, "ECB Key Rate"),
    fetchEcbSeries(ECB_MORTGAGE_RATE_SERIES, "Eurozone Mortgage Rate"),
  ]);

  if (keyRateData) {
    await db.insert(marketDataCache).values({
      dataType: MARKET_DATA_TYPES.interest_rate,
      region: "ecb_key_rate",
      data: keyRateData,
      fetchedAt: new Date(),
    });
    results.keyRate = true;
  }

  if (mortgageRateData) {
    await db.insert(marketDataCache).values({
      dataType: MARKET_DATA_TYPES.interest_rate,
      region: "ecb_mortgage_rate",
      data: mortgageRateData,
      fetchedAt: new Date(),
    });
    results.mortgageRate = true;
  }

  logger.info({ results }, "ECB interest rate sync completed");
  return results;
}

/**
 * Get the latest cached interest rates.
 */
export async function getLatestInterestRates(): Promise<{
  keyRate: InterestRateData | null;
  mortgageRate: InterestRateData | null;
  lastSynced: Date | null;
}> {
  const [keyRateRow] = await db
    .select()
    .from(marketDataCache)
    .where(
      and(
        eq(marketDataCache.dataType, MARKET_DATA_TYPES.interest_rate),
        eq(marketDataCache.region, "ecb_key_rate"),
      ),
    )
    .orderBy(desc(marketDataCache.fetchedAt))
    .limit(1);

  const [mortgageRateRow] = await db
    .select()
    .from(marketDataCache)
    .where(
      and(
        eq(marketDataCache.dataType, MARKET_DATA_TYPES.interest_rate),
        eq(marketDataCache.region, "ecb_mortgage_rate"),
      ),
    )
    .orderBy(desc(marketDataCache.fetchedAt))
    .limit(1);

  const lastSynced =
    keyRateRow?.fetchedAt ?? mortgageRateRow?.fetchedAt ?? null;

  return {
    keyRate: keyRateRow ? (keyRateRow.data as InterestRateData) : null,
    mortgageRate: mortgageRateRow
      ? (mortgageRateRow.data as InterestRateData)
      : null,
    lastSynced,
  };
}

/**
 * Get historical interest rate entries for chart display.
 */
export async function getInterestRateHistory(
  months: number = 24,
): Promise<InterestRateEntry[]> {
  const [latestRow] = await db
    .select()
    .from(marketDataCache)
    .where(
      and(
        eq(marketDataCache.dataType, MARKET_DATA_TYPES.interest_rate),
        eq(marketDataCache.region, "ecb_mortgage_rate"),
      ),
    )
    .orderBy(desc(marketDataCache.fetchedAt))
    .limit(1);

  if (!latestRow) return [];

  const data = latestRow.data as InterestRateData;
  const cutoff = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7);

  return data.entries.filter((e) => e.date >= cutoff);
}

/**
 * Get the rent benchmark for a given city/region.
 * Returns the latest benchmark rate in cents per sqm, or null if none found.
 */
export async function getRentBenchmarkForCity(
  city: string,
): Promise<number | null> {
  const normalizedCity = city.toLowerCase().trim();

  const benchmarks = await db
    .select()
    .from(marketDataCache)
    .where(eq(marketDataCache.dataType, MARKET_DATA_TYPES.rent_benchmark))
    .orderBy(desc(marketDataCache.fetchedAt));

  for (const benchmark of benchmarks) {
    const region = benchmark.region?.toLowerCase().trim();
    if (region === normalizedCity) {
      const data = benchmark.data as { rentPerSqmCents: number };
      return data.rentPerSqmCents;
    }
  }

  return null;
}

/**
 * Returns all rent benchmarks as a Map<normalizedCity, rentPerSqmCents>.
 * Uses the most recent entry per region.
 */
export async function getAllRentBenchmarks(): Promise<Map<string, number>> {
  const benchmarks = await db
    .select()
    .from(marketDataCache)
    .where(eq(marketDataCache.dataType, MARKET_DATA_TYPES.rent_benchmark))
    .orderBy(desc(marketDataCache.fetchedAt));

  const result = new Map<string, number>();
  for (const benchmark of benchmarks) {
    const region = benchmark.region?.toLowerCase().trim();
    if (region && !result.has(region)) {
      const data = benchmark.data as { rentPerSqmCents: number };
      result.set(region, data.rentPerSqmCents);
    }
  }

  return result;
}
