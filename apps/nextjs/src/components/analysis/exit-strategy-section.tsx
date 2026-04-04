"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/components/ui/area-chart";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Shield, AlertTriangle, DollarSign, Home } from "lucide-react";

export function ExitStrategySection() {
  const t = useTranslations("analysis.exitStrategy");
  const { formatCurrency, formatCompactCurrency } = useCurrency();

  const [saleInYears, setSaleInYears] = useState(10);
  const [annualAppreciation, setAnnualAppreciation] = useState(200); // 2%
  const [brokerFeeRate, setBrokerFeeRate] = useState(357); // 3.57%
  const [personalTaxRate, setPersonalTaxRate] = useState(4200); // 42%

  const { data, isLoading } = trpc.analysis.getExitStrategy.useQuery({
    saleInYears,
    annualAppreciation,
    brokerFeeRate,
    personalTaxRate,
  });

  const handleYearsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaleInYears(Number(e.target.value));
    },
    [],
  );

  const handleAppreciationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAnnualAppreciation(Number(e.target.value));
    },
    [],
  );

  const handleBrokerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBrokerFeeRate(Number(e.target.value));
    },
    [],
  );

  const handleTaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPersonalTaxRate(Number(e.target.value));
    },
    [],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      {/* Controls */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Sale year slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t("saleInYears")}
                </label>
                <span className="text-sm font-medium">
                  {saleInYears} {t("years")}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={saleInYears}
                onChange={handleYearsChange}
                className="w-full accent-primary"
              />
            </div>

            {/* Appreciation rate slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t("appreciation")}
                </label>
                <span className="text-sm font-medium">
                  {(annualAppreciation / 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2000}
                step={10}
                value={annualAppreciation}
                onChange={handleAppreciationChange}
                className="w-full accent-primary"
              />
            </div>

            {/* Broker fee slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t("brokerFee")}
                </label>
                <span className="text-sm font-medium">
                  {(brokerFeeRate / 100).toFixed(2)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={1}
                value={brokerFeeRate}
                onChange={handleBrokerChange}
                className="w-full accent-primary"
              />
            </div>

            {/* Personal tax rate slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t("taxRate")}
                </label>
                <span className="text-sm font-medium">
                  {(personalTaxRate / 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={personalTaxRate}
                onChange={handleTaxChange}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : data && data.length > 0 ? (
        data.map((prop) => (
          <Card key={prop.propertyId}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{prop.propertyName}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Speculation tax status */}
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  prop.speculationTaxFree
                    ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                    : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                }`}
              >
                {prop.speculationTaxFree ? (
                  <Shield className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {prop.speculationTaxFree ? t("taxFree") : t("taxable")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("speculationEnd")}: {prop.timeline.speculationEndDate}
                  </p>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("projectedPrice")}
                  </p>
                  <p className="text-lg font-bold">
                    {formatCompactCurrency(prop.projectedSalePrice)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("brokerFeeAmount")}
                  </p>
                  <p className="text-lg font-bold">
                    {formatCompactCurrency(prop.brokerFee)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("speculationTax")}
                  </p>
                  <p
                    className={`text-lg font-bold ${prop.speculationTaxAmount > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {formatCurrency(prop.speculationTaxAmount)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <DollarSign className="mb-1 h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {t("netProceeds")}
                  </p>
                  <p
                    className={`text-lg font-bold ${prop.netProceeds >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCompactCurrency(prop.netProceeds)}
                  </p>
                </div>
              </div>

              {/* Area chart: projected value vs remaining balance */}
              {prop.perYear.length > 0 && (
                <AreaChart
                  data={prop.perYear.map((entry) => ({
                    year: String(entry.year),
                    projectedValue: entry.projectedValue,
                    remainingBalance: entry.remainingBalance,
                    netEquity: entry.netEquity,
                  }))}
                  areas={[
                    {
                      key: "projectedValue",
                      label: t("projectedValue"),
                      color: "hsl(var(--chart-1))",
                    },
                    {
                      key: "remainingBalance",
                      label: t("remainingBalance"),
                      color: "hsl(var(--chart-4))",
                      strokeDasharray: "5 5",
                    },
                    {
                      key: "netEquity",
                      label: t("netEquity"),
                      color: "hsl(var(--chart-2))",
                    },
                  ]}
                  xAxisKey="year"
                  height={240}
                  formatYAxis={(v) => formatCompactCurrency(v)}
                  formatTooltip={(v) => formatCurrency(v)}
                />
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noProperties")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
