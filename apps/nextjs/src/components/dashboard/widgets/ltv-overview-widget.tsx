"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

function getLtvColor(ltv: number): string {
  if (ltv > 80) return "bg-red-500";
  if (ltv > 60) return "bg-yellow-500";
  return "bg-green-500";
}

function getLtvBgColor(ltv: number): string {
  if (ltv > 80) return "text-red-600";
  if (ltv > 60) return "text-yellow-600";
  return "text-green-600";
}

export function LtvOverviewWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.ltvOverview");
  const { data, isLoading } = trpc.dashboard.getLtvOverview.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
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
          {data.map((item) => (
            <div key={item.propertyId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">
                  {item.propertyName}
                </span>
                <span className={`font-medium ${getLtvBgColor(item.ltv)}`}>
                  {item.ltv.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${getLtvColor(item.ltv)}`}
                  style={{ width: `${Math.min(item.ltv, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}
