"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { HealthScoreResult } from "@repo/shared/calculations";

interface HealthScoreDetailProps {
  healthScore: HealthScoreResult;
  weights: {
    cashflow: number;
    ltv: number;
    yield: number;
  };
}

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

export function HealthScoreDetail({
  healthScore,
  weights,
}: HealthScoreDetailProps) {
  const t = useTranslations("dashboard.healthScore");

  const metrics = [
    {
      label: t("cashflow"),
      score: healthScore.cashflowScore,
      weight: weights.cashflow,
    },
    {
      label: t("ltv"),
      score: healthScore.ltvScore,
      weight: weights.ltv,
    },
    {
      label: t("yield"),
      score: healthScore.yieldScore,
      weight: weights.yield,
    },
  ];

  return (
    <Card size="sm">
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
    </Card>
  );
}
