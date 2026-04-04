"use client";

import { useTranslations } from "next-intl";
import {
  Wallet,
  TrendingUp,
  Activity,
  Building2,
  Lightbulb,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrency } from "@/lib/hooks/use-currency";
import type { HealthScoreResult } from "@repo/shared/calculations";

interface DashboardKpiBarProps {
  netWorth: number;
  monthlyCashflow: number;
  healthScore: HealthScoreResult;
  totalMarketValue: number;
  optimizationPotential: number;
  isLoading?: boolean;
}

function getHealthScoreColor(score: number): string {
  if (score < 40) return "text-red-600";
  if (score < 70) return "text-yellow-600";
  return "text-green-600";
}

function getHealthScoreBg(score: number): string {
  if (score < 40) return "bg-red-100";
  if (score < 70) return "bg-yellow-100";
  return "bg-green-100";
}

export function DashboardKpiBar({
  netWorth,
  monthlyCashflow,
  healthScore,
  totalMarketValue,
  optimizationPotential,
  isLoading,
}: DashboardKpiBarProps) {
  const t = useTranslations("dashboard.kpi");
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: t("netWorth"),
      value: formatCurrency(netWorth),
      icon: Wallet,
      tooltip: t("netWorthTooltip"),
      colorClass: netWorth >= 0 ? "text-foreground" : "text-red-600",
    },
    {
      label: t("cashflow"),
      value: formatCurrency(monthlyCashflow),
      icon: TrendingUp,
      tooltip: t("cashflowTooltip"),
      colorClass: monthlyCashflow >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: t("healthScore"),
      value: `${healthScore.score}/100`,
      icon: Activity,
      tooltip: t("healthScoreTooltip"),
      colorClass: getHealthScoreColor(healthScore.score),
      bgClass: getHealthScoreBg(healthScore.score),
    },
    {
      label: t("portfolioValue"),
      value: formatCurrency(totalMarketValue),
      icon: Building2,
      tooltip: t("portfolioValueTooltip"),
      colorClass: "text-foreground",
    },
    {
      label: t("optimizationPotential"),
      value: formatCurrency(optimizationPotential),
      icon: Lightbulb,
      tooltip: t("optimizationPotentialTooltip"),
      colorClass:
        optimizationPotential > 0 ? "text-blue-600" : "text-muted-foreground",
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} size="sm">
            <CardContent className="flex items-center gap-3">
              <div
                className={`rounded-md p-2 ${kpi.bgClass ?? "bg-primary/10"}`}
              >
                <kpi.icon
                  className={`h-4 w-4 ${kpi.bgClass ? kpi.colorClass : "text-primary"}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {kpi.label}
                  </p>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{kpi.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={`text-sm font-semibold ${kpi.colorClass}`}>
                  {kpi.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
