"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/components/ui/donut-chart";
import { formatPercentage } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";

const CHART_COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 50%)",
  "hsl(190, 70%, 45%)",
  "hsl(45, 85%, 50%)",
  "hsl(100, 55%, 45%)",
  "hsl(320, 55%, 55%)",
  "hsl(250, 55%, 55%)",
];

type ViewMode = "value" | "count";

export function PortfolioAllocationWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.allocation");
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [viewMode, setViewMode] = useState<ViewMode>("value");

  const { data, isLoading } = trpc.dashboard.getPortfolioAllocation.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("title")}</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("title")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        </CardContent>
      </>
    );
  }

  const threshold = data.threshold;
  const propertyCount = data.items.length;

  const mainItems = data.items.filter(
    (item) => item.percentage >= threshold * 100,
  );
  const otherItems = data.items.filter(
    (item) => item.percentage < threshold * 100,
  );

  const groupedItems =
    otherItems.length > 0
      ? [
          ...mainItems,
          {
            propertyId: "__other__",
            name: t("other"),
            marketValue: otherItems.reduce((s, i) => s + i.marketValue, 0),
            percentage: 10000 - mainItems.reduce((s, i) => s + i.percentage, 0),
          },
        ]
      : mainItems;

  const chartData =
    viewMode === "value"
      ? groupedItems.map((item, index) => ({
          name: item.name,
          value: item.marketValue,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
      : groupedItems.map((item, index) => ({
          name: item.name,
          value: 1,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }));

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("title")}</p>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "value" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("value")}
            >
              {t("byValue")}
            </Button>
            <Button
              variant={viewMode === "count" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("count")}
            >
              {t("byCount")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DonutChart
          data={chartData}
          centerLabel={t("properties")}
          centerValue={propertyCount.toString()}
          showLegend={false}
          formatTooltip={(value) =>
            viewMode === "value" ? formatCurrency(value) : value.toString()
          }
          onSegmentClick={(entry) => {
            const item = data.items.find((i) => i.name === entry.name);
            if (item && item.propertyId !== "__other__") {
              router.push(`/properties/${item.propertyId}`);
            }
          }}
        />

        <div className="mt-4 space-y-2">
          {groupedItems.map((item, index) => (
            <div
              key={item.propertyId}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <span className="truncate text-muted-foreground">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {formatCurrency(item.marketValue)}
                </span>
                <span className="text-muted-foreground">
                  {formatPercentage(item.percentage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}
