"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";

function getBucketColor(bucket: string): string {
  switch (bucket) {
    case "0-30":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "30-60":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "60+":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function RentArrearsWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.rentArrears");
  const { formatCurrency } = useCurrency();
  const { data, isLoading } = trpc.dashboard.getRentArrears.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </>
    );
  }

  if (!data || data.totalOverdue === 0) {
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
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("name")}</p>
          <p className="text-sm font-semibold text-red-600">
            {formatCurrency(data.totalOverdue)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.buckets.map((bucket) => (
            <div
              key={bucket.label}
              className={`rounded-lg border p-3 ${getBucketColor(bucket.label)}`}
            >
              <p className="text-xs font-medium">
                {bucket.label} {t("days")}
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatCurrency(bucket.amount)}
              </p>
              <p className="text-xs opacity-70">
                {bucket.count} {t("tenants")}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}
