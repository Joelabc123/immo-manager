"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { DashboardKpiBar } from "@/components/dashboard/dashboard-kpi-bar";
import { HealthScoreDetail } from "@/components/dashboard/health-score-detail";
import { WealthForecastChart } from "@/components/dashboard/wealth-forecast-chart";
import { PortfolioAllocationChart } from "@/components/dashboard/portfolio-allocation-chart";
import { ActionCenter } from "@/components/dashboard/action-center";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { data: kpis, isLoading } = trpc.dashboard.getKpis.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <DashboardKpiBar
        netWorth={kpis?.netWorth ?? 0}
        monthlyCashflow={kpis?.monthlyCashflow ?? 0}
        healthScore={
          kpis?.healthScore ?? {
            score: 0,
            cashflowScore: 0,
            ltvScore: 0,
            yieldScore: 0,
          }
        }
        totalMarketValue={kpis?.totalMarketValue ?? 0}
        optimizationPotential={0}
        isLoading={isLoading}
      />

      {kpis && (
        <HealthScoreDetail
          healthScore={kpis.healthScore}
          weights={{
            cashflow: 34,
            ltv: 33,
            yield: 33,
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WealthForecastChart />
        </div>
        <div className="lg:col-span-2">
          <PortfolioAllocationChart />
        </div>
      </div>

      <ActionCenter />
    </div>
  );
}
