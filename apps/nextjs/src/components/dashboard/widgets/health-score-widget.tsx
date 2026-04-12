"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

function getScoreColor(score: number): string {
  if (score < 40) return "bg-red-500";
  if (score < 70) return "bg-yellow-500";
  return "bg-green-500";
}

function getScoreTextColor(score: number): string {
  if (score < 40) return "text-red-600";
  if (score < 70) return "text-yellow-600";
  return "text-green-600";
}

export function HealthScoreWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.healthScore");
  const { data: kpis, isLoading } = trpc.dashboard.getKpis.useQuery();

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const healthScore = kpis?.healthScore ?? {
    score: 0,
    cashflowScore: 0,
    ltvScore: 0,
    yieldScore: 0,
  };

  const metrics = [
    {
      label: t("cashflow"),
      score: healthScore.cashflowScore,
      weight: 34,
    },
    {
      label: t("ltv"),
      score: healthScore.ltvScore,
      weight: 33,
    },
    {
      label: t("yield"),
      score: healthScore.yieldScore,
      weight: 33,
    },
  ];

  return (
    <>
      <CardHeader>
        <p className="text-sm font-medium">{t("subMetrics")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {metric.label}{" "}
                <span className="text-muted-foreground/60">
                  ({t("weight")}: {metric.weight}%)
                </span>
              </span>
              <span
                className={`font-medium ${getScoreTextColor(metric.score)}`}
              >
                {metric.score}/100
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${getScoreColor(metric.score)}`}
                style={{ width: `${metric.score}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </>
  );
}
