"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/components/ui/area-chart";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";
import type { WealthForecastEntry } from "@repo/shared/calculations";

interface WealthForecastChartProps {
  retirementYear?: number | null;
  defaultGrowthRate?: number;
}

const TIME_HORIZONS = [5, 10, 20] as const;

export function WealthForecastChart({
  retirementYear,
  defaultGrowthRate = 200,
}: WealthForecastChartProps) {
  const t = useTranslations("dashboard.forecast");
  const { formatCurrency, formatCompactCurrency } = useCurrency();

  const [growthRate, setGrowthRate] = useState(defaultGrowthRate);
  const [inflationRate, setInflationRate] = useState(200);
  const [rentGrowthRate, setRentGrowthRate] = useState(150);
  const [timeHorizon, setTimeHorizon] = useState(10);

  const currentYear = new Date().getFullYear();
  const retirementHorizon = retirementYear
    ? Math.max(1, retirementYear - currentYear)
    : null;

  const { data, isLoading } = trpc.dashboard.getWealthForecast.useQuery({
    growthRate,
    inflationRate,
    rentGrowthRate,
    timeHorizonYears: timeHorizon,
  });

  const chartData = (data ?? []).map((entry: WealthForecastEntry) => ({
    year: `${currentYear + entry.year}`,
    marketValue: entry.marketValue,
    remainingBalance: entry.remainingBalance,
    netWealth: entry.netWealth,
  }));

  const lastEntry = data?.[data.length - 1];
  const firstEntry = data?.[0];

  const handleSliderChange = useCallback(
    (setter: (value: number) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(Number(e.target.value));
      },
    [],
  );

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium">{t("title")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time horizon buttons */}
        <div className="flex flex-wrap gap-2">
          {TIME_HORIZONS.map((h) => (
            <Button
              key={h}
              variant={timeHorizon === h ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeHorizon(h)}
            >
              {h} {t("years")}
            </Button>
          ))}
          {retirementHorizon && (
            <Button
              variant={
                timeHorizon === retirementHorizon ? "default" : "outline"
              }
              size="sm"
              onClick={() => setTimeHorizon(retirementHorizon)}
            >
              {t("retirement")}
            </Button>
          )}
        </div>

        {/* Sliders */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {t("growthRate")}: {(growthRate / 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={growthRate}
              onChange={handleSliderChange(setGrowthRate)}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {t("inflation")}: {(inflationRate / 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={inflationRate}
              onChange={handleSliderChange(setInflationRate)}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {t("rentGrowth")}: {(rentGrowthRate / 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={rentGrowthRate}
              onChange={handleSliderChange(setRentGrowthRate)}
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* Chart */}
        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : chartData.length > 0 ? (
          <AreaChart
            data={chartData}
            xAxisKey="year"
            areas={[
              {
                key: "marketValue",
                label: t("marketValue"),
                color: "hsl(var(--chart-1, 220 70% 50%))",
              },
              {
                key: "remainingBalance",
                label: t("remainingBalance"),
                color: "hsl(var(--chart-2, 0 70% 50%))",
              },
              {
                key: "netWealth",
                label: t("netWealth"),
                color: "hsl(var(--chart-3, 142 70% 45%))",
              },
            ]}
            formatYAxis={(v) => formatCompactCurrency(v)}
            formatTooltip={(v) => formatCurrency(v)}
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        )}

        {/* End value cards */}
        {lastEntry && firstEntry && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("endNetWealth")}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(lastEntry.netWealth)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("totalAppreciation")}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(lastEntry.marketValue - firstEntry.marketValue)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("equityGained")}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(lastEntry.netWealth - firstEntry.netWealth)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
