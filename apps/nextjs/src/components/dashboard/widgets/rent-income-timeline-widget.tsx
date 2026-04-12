"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/ui/bar-chart";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";

export function RentIncomeTimelineWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.rentIncomeTimeline");
  const { formatCurrency, formatCompactCurrency } = useCurrency();
  const { data, isLoading } = trpc.dashboard.getRentIncomeTimeline.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </>
    );
  }

  if (!data || data.length === 0) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <p className="text-sm font-medium">{t("name")}</p>
      </CardHeader>
      <CardContent>
        <BarChart
          data={data}
          xAxisKey="month"
          bars={[
            {
              key: "amount",
              label: t("income"),
              color: "hsl(var(--chart-1, 220 70% 50%))",
            },
          ]}
          formatYAxis={(v) => formatCompactCurrency(v)}
          formatTooltip={(v) => formatCurrency(v)}
        />
      </CardContent>
    </>
  );
}
