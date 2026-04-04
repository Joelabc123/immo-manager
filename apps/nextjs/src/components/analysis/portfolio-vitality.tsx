"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { formatPercentage } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const RISK_TIMEFRAMES = [1, 2, 3, 5] as const;

export function PortfolioVitality() {
  const t = useTranslations("analysis.vitality");
  const { formatCurrency } = useCurrency();
  const [riskYears, setRiskYears] = useState(3);

  const { data, isLoading } = trpc.analysis.getPortfolioVitality.useQuery({
    refinancingRiskYears: riskYears,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!data || data.statusText === "no_data") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("noData")}
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    critical: {
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/30",
      icon: XCircle,
    },
    needs_improvement: {
      color: "text-yellow-600",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      icon: AlertTriangle,
    },
    stable: {
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
      icon: CheckCircle,
    },
    excellent: {
      color: "text-emerald-600",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      icon: Shield,
    },
  };

  const status =
    statusConfig[data.statusText as keyof typeof statusConfig] ??
    statusConfig.stable;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Health Score Card */}
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">{t("healthScore")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full ${status.bg}`}
              >
                <span className={`text-2xl font-bold ${status.color}`}>
                  {data.healthScore.score}
                </span>
              </div>
              <div>
                <div
                  className={`flex items-center gap-1.5 font-medium ${status.color}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {t(`status.${data.statusText}`)}
                </div>
                <p className="text-xs text-muted-foreground">{t("outOf100")}</p>
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="space-y-2">
              {(
                [
                  { key: "cashflow", score: data.healthScore.cashflowScore },
                  { key: "ltv", score: data.healthScore.ltvScore },
                  { key: "yield", score: data.healthScore.yieldScore },
                ] as const
              ).map((metric) => (
                <div key={metric.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t(`metrics.${metric.key}`)}
                    </span>
                    <span className="font-medium">{metric.score}/100</span>
                  </div>
                  <Progress value={metric.score} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Refinancing Risk Card */}
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">{t("refinancingRisk")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1">
              {RISK_TIMEFRAMES.map((y) => (
                <Button
                  key={y}
                  variant={riskYears === y ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRiskYears(y)}
                >
                  {y} {t("years")}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("expiringVolume")}
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(data.refinancingRisk.expiringVolume)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("expiringCount")}
                </p>
                <p className="text-lg font-bold">
                  {data.refinancingRisk.expiringCount}
                </p>
              </div>
            </div>

            {data.refinancingRisk.totalVolume > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("shareOfTotal")}</span>
                  <span>
                    {Math.round(
                      (data.refinancingRisk.expiringVolume /
                        data.refinancingRisk.totalVolume) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (data.refinancingRisk.expiringVolume /
                      data.refinancingRisk.totalVolume) *
                    100
                  }
                  className="mt-1 h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Break-Even Rates per Property */}
      {data.breakEvenRates.filter((b) => b.hasLoans).length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">{t("breakEvenRates")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.breakEvenRates
                .filter((b) => b.hasLoans)
                .map((item) => {
                  const ratio =
                    item.breakEvenRate > 0
                      ? item.currentWeightedRate / item.breakEvenRate
                      : 1;
                  const color =
                    ratio > 0.8
                      ? "bg-red-500"
                      : ratio > 0.6
                        ? "bg-yellow-500"
                        : "bg-green-500";

                  return (
                    <div key={item.propertyId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{item.propertyName}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatPercentage(item.currentWeightedRate)} /{" "}
                          {formatPercentage(item.breakEvenRate)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{
                            width: `${Math.min(100, ratio * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              <p className="text-xs text-muted-foreground">
                {t("breakEvenExplanation")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
