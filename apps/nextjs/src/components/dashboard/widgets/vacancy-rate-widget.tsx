"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/components/ui/donut-chart";
import { trpc } from "@/lib/trpc";

export function VacancyRateWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.vacancyRate");
  const { data, isLoading } = trpc.dashboard.getVacancyRate.useQuery();

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

  if (!data || data.totalUnits === 0) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        </CardContent>
      </>
    );
  }

  const chartData = [
    {
      name: t("occupied"),
      value: data.occupiedUnits,
      color: "hsl(142, 70%, 45%)",
    },
    {
      name: t("vacant"),
      value: data.vacantUnits,
      color: "hsl(0, 70%, 50%)",
    },
  ];

  const vacancyPercent = Math.round((data.vacantUnits / data.totalUnits) * 100);

  return (
    <>
      <CardHeader>
        <p className="text-sm font-medium">{t("name")}</p>
      </CardHeader>
      <CardContent>
        <DonutChart
          data={chartData}
          centerLabel={t("vacancyRate")}
          centerValue={`${vacancyPercent}%`}
          showLegend
        />
        {data.vacantUnitNames.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("vacantUnits")}:
            </p>
            {data.vacantUnitNames.slice(0, 5).map((name) => (
              <p key={name} className="text-xs text-muted-foreground">
                {name}
              </p>
            ))}
            {data.vacantUnitNames.length > 5 && (
              <p className="text-xs text-muted-foreground/60">
                +{data.vacantUnitNames.length - 5} {t("more")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </>
  );
}
