"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/components/ui/area-chart";
import { trpc } from "@/lib/trpc";
import { formatPercentage } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { AlertTriangle, TrendingDown, Shield, Info } from "lucide-react";

export function StressTestSection() {
  const t = useTranslations("analysis.stressTest");
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const [scenarioRate, setScenarioRate] = useState(600); // 6% default

  const { data, isLoading } = trpc.analysis.getStressTest.useQuery({
    scenarioRate,
  });

  const { data: ecbRates } = trpc.marketData.getInterestRates.useQuery();

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setScenarioRate(Number(e.target.value));
    },
    [],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      {/* Scenario Rate Slider */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                {t("scenarioRate")}
              </label>
              <span className="text-sm font-medium">
                {(scenarioRate / 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1500}
              step={10}
              value={scenarioRate}
              onChange={handleSliderChange}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>15%</span>
            </div>
            {ecbRates && (ecbRates.keyRate || ecbRates.mortgageRate) && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>
                  {t("ecbReference")}:{" "}
                  {[ecbRates.keyRate, ecbRates.mortgageRate]
                    .filter((r): r is NonNullable<typeof r> => r !== null)
                    .map((r) => {
                      const latest = r.entries[r.entries.length - 1];
                      return latest
                        ? `${r.label} ${formatPercentage(latest.rateBasisPoints)}`
                        : r.label;
                    })
                    .join(" | ")}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : data?.portfolio ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("cashflowDelta")}
                  </span>
                </div>
                <p
                  className={`mt-1 text-2xl font-bold ${data.portfolio.cashflowDelta < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {formatCurrency(data.portfolio.cashflowDelta)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {t("month")}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("dscr")}
                  </span>
                </div>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    data.portfolio.dscr < 1
                      ? "text-red-600"
                      : data.portfolio.dscr < 1.2
                        ? "text-yellow-600"
                        : "text-green-600"
                  }`}
                >
                  {data.portfolio.dscr.toFixed(2)}x
                </p>
                {data.portfolio.dscr < 1.2 && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    {t("dscrWarning")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  {t("breakEvenRate")}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatPercentage(data.portfolio.breakEvenRate)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interest Cost Chart */}
          {data.portfolio.perYear.length > 0 && (
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">{t("interestCostChart")}</p>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={data.portfolio.perYear.map((entry) => ({
                    year: String(entry.year),
                    baseline: entry.baselineInterest,
                    scenario: entry.scenarioInterest,
                  }))}
                  areas={[
                    {
                      key: "baseline",
                      label: t("baseline"),
                      color: "hsl(var(--chart-1))",
                    },
                    {
                      key: "scenario",
                      label: t("scenario"),
                      color: "hsl(var(--chart-4))",
                      strokeDasharray: "5 5",
                    },
                  ]}
                  xAxisKey="year"
                  height={300}
                  formatYAxis={(v) => formatCompactCurrency(v)}
                  formatTooltip={(v) => formatCurrency(v)}
                />
              </CardContent>
            </Card>
          )}

          {/* Per-Property Table */}
          {data.perProperty.length > 0 && (
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">{t("perProperty")}</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">{t("property")}</th>
                        <th className="pb-2 text-right font-medium">
                          {t("cashflowDelta")}
                        </th>
                        <th className="pb-2 text-right font-medium">
                          {t("dscr")}
                        </th>
                        <th className="pb-2 text-right font-medium">
                          {t("breakEvenRate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perProperty.flatMap((prop) =>
                        prop
                          ? [
                              <tr
                                key={prop.propertyId}
                                className="border-b last:border-0"
                              >
                                <td className="py-2">{prop.propertyName}</td>
                                <td
                                  className={`py-2 text-right ${prop.cashflowDelta < 0 ? "text-red-600" : "text-green-600"}`}
                                >
                                  {formatCurrency(prop.cashflowDelta)}
                                </td>
                                <td
                                  className={`py-2 text-right ${
                                    prop.dscr < 1
                                      ? "text-red-600"
                                      : prop.dscr < 1.2
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                  }`}
                                >
                                  {prop.dscr.toFixed(2)}x
                                </td>
                                <td className="py-2 text-right">
                                  {formatPercentage(prop.breakEvenRate)}
                                </td>
                              </tr>,
                            ]
                          : [],
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noData")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
