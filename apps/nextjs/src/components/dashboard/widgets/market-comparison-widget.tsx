"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";

export function MarketComparisonWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.marketComparison");
  const { formatCurrency } = useCurrency();
  const { data, isLoading } = trpc.dashboard.getMarketComparison.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
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
          <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
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
        <div className="space-y-3">
          {data.map((item) => {
            const diff = item.actualRentSqm - item.benchmarkRentSqm;
            const isAbove = diff >= 0;

            return (
              <div key={item.propertyId} className="rounded-lg border p-3">
                <p className="truncate text-sm font-medium">
                  {item.propertyName}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">
                      {t("actual")}:{" "}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.actualRentSqm)}/m2
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("benchmark")}:{" "}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.benchmarkRentSqm)}/m2
                    </span>
                  </div>
                  <span
                    className={`font-medium ${isAbove ? "text-green-600" : "text-red-600"}`}
                  >
                    {isAbove ? "+" : ""}
                    {formatCurrency(diff)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
