"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/components/ui/donut-chart";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";

const CATEGORY_COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 50%)",
  "hsl(190, 70%, 45%)",
  "hsl(45, 85%, 50%)",
  "hsl(100, 55%, 45%)",
];

export function ExpensesByCategoryWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.expensesByCategory");
  const { formatCurrency } = useCurrency();
  const { data, isLoading } = trpc.dashboard.getExpensesByCategory.useQuery();

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

  const chartData = data.map((item, index) => ({
    name: t(`categories.${item.category}`),
    value: item.amount,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("name")}</p>
          <p className="text-sm font-semibold">{formatCurrency(total)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <DonutChart
          data={chartData}
          centerLabel={t("total")}
          centerValue={formatCurrency(total)}
          showLegend
          formatTooltip={(value) => formatCurrency(value)}
        />
      </CardContent>
    </>
  );
}
