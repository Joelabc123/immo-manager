"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "@/components/ui/area-chart";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Trophy, TrendingDown, Clock, Percent } from "lucide-react";

export function SpecialRepaymentSection() {
  const t = useTranslations("analysis.specialRepayment");
  const { formatCurrency, formatCompactCurrency } = useCurrency();

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [annualAmount, setAnnualAmount] = useState(500000); // 5,000 EUR
  const [refinanceRate, setRefinanceRate] = useState(400); // 4%
  const [etfReturnRate] = useState(700); // 7%
  const [capitalGainsTaxRate] = useState(2500); // 25%

  const { data: loansData } = trpc.analysis.getLoansForAnalysis.useQuery();

  // Auto-select the first loan
  const activeLoanId = selectedLoanId ?? loansData?.[0]?.id ?? null;
  const activeLoan = loansData?.find((l) => l.id === activeLoanId);
  const limit = activeLoan?.annualSpecialRepaymentLimit ?? 0;

  const { data, isLoading } =
    trpc.analysis.getSpecialRepaymentAnalysis.useQuery(
      {
        loanId: activeLoanId!,
        annualSpecialRepayment: annualAmount,
        projectedRefinanceRate: refinanceRate,
        etfReturnRate,
        capitalGainsTaxRate,
      },
      { enabled: !!activeLoanId },
    );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAnnualAmount(Number(e.target.value));
    },
    [],
  );

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRefinanceRate(Number(e.target.value));
    },
    [],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      {/* Loan Selector & Sliders */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Loan selector */}
          {loansData && loansData.length > 1 && (
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">
                {t("selectLoan")}
              </label>
              <select
                value={activeLoanId ?? ""}
                onChange={(e) => setSelectedLoanId(e.target.value || null)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {loansData.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.bankName} - {loan.propertyName} (
                    {formatCurrency(loan.remainingBalance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Annual special repayment slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                {t("annualAmount")}
              </label>
              <span className="text-sm font-medium">
                {formatCurrency(annualAmount)}
                {limit > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (max {formatCurrency(limit)})
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={limit > 0 ? limit : 5000000}
              step={50000}
              value={annualAmount}
              onChange={handleAmountChange}
              className="w-full accent-primary"
            />
            {data?.withSpecial.limitExceeded && (
              <p className="text-xs text-yellow-600">{t("limitExceeded")}</p>
            )}
          </div>

          {/* Projected refinance rate slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                {t("refinanceRate")}
              </label>
              <span className="text-sm font-medium">
                {(refinanceRate / 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={refinanceRate}
              onChange={handleRateChange}
              className="w-full accent-primary"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data ? (
        <>
          {/* Winner Card (Fazit) */}
          <Card
            className={
              data.winner === "special_repayment"
                ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                : "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
            }
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <Trophy
                className={`h-8 w-8 ${
                  data.winner === "special_repayment"
                    ? "text-green-600"
                    : "text-blue-600"
                }`}
              />
              <div>
                <p className="font-semibold">{t("verdict")}</p>
                <p className="text-sm">
                  {t(
                    data.winner === "special_repayment"
                      ? "winnerSpecialRepayment"
                      : "winnerEtf",
                  )}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {t("advantage")}: {formatCurrency(data.advantageAmount)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t("interestSaved")}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-green-600">
                  {formatCurrency(data.interestSaved)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t("monthsSaved")}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold">
                  {data.monthsSaved} {t("months")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t("etfGross")}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold">
                  {formatCurrency(data.etfComparison.grossValue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <span className="text-xs text-muted-foreground">
                  {t("etfNet")}
                </span>
                <p className="mt-1 text-lg font-bold">
                  {formatCurrency(data.etfComparison.netValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("invested")}:{" "}
                  {formatCurrency(data.etfComparison.totalInvested)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {data.perYear.length > 0 && (
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">{t("chartTitle")}</p>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={data.perYear.map((entry) => ({
                    year: String(entry.year),
                    balanceWithout: entry.balanceWithout,
                    balanceWith: entry.balanceWith,
                    etfValue: entry.etfValue,
                  }))}
                  areas={[
                    {
                      key: "balanceWithout",
                      label: t("withoutSpecial"),
                      color: "hsl(var(--chart-4))",
                    },
                    {
                      key: "balanceWith",
                      label: t("withSpecial"),
                      color: "hsl(var(--chart-1))",
                    },
                    {
                      key: "etfValue",
                      label: t("etfSavings"),
                      color: "hsl(var(--chart-2))",
                      strokeDasharray: "5 5",
                    },
                  ]}
                  xAxisKey="year"
                  height={300}
                  formatYAxis={(v) => formatCompactCurrency(v)}
                  formatTooltip={(v) => formatCurrency(v)}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {loansData?.length === 0 ? t("noLoans") : t("selectLoanPrompt")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
