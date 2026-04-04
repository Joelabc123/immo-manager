"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatPercentage } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { CheckCircle, XCircle, TrendingUp, Info } from "lucide-react";

export function RefinancingSection() {
  const t = useTranslations("analysis.refinancing");
  const { formatCurrency } = useCurrency();

  const [newRate, setNewRate] = useState(250); // 2.5% default
  const [refinanceCosts, setRefinanceCosts] = useState(300000); // 3,000 EUR

  const { data, isLoading } = trpc.analysis.getRefinancingAnalysis.useQuery({
    newInterestRate: newRate,
    refinanceCosts,
  });

  const { data: ecbRates } = trpc.marketData.getInterestRates.useQuery();

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewRate(Number(e.target.value));
    },
    [],
  );

  const handleCostsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRefinanceCosts(Number(e.target.value) * 100);
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
            {/* New rate slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t("newRate")}
                </label>
                <span className="text-sm font-medium">
                  {(newRate / 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={10}
                value={newRate}
                onChange={handleRateChange}
                className="w-full accent-primary"
              />
            </div>

            {/* Refinancing costs input */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">
                {t("costs")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={Math.round(refinanceCosts / 100)}
                  onChange={handleCostsChange}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">EUR</span>
              </div>
            </div>
          </div>
          {ecbRates && (ecbRates.keyRate || ecbRates.mortgageRate) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>
                {t("ecbReference")}:{" "}
                {[ecbRates.keyRate, ecbRates.mortgageRate]
                  .filter((r): r is NonNullable<typeof r> => r !== null)
                  .map((r) => {
                    const latest = r.entries[r.entries.length - 1];
                    return latest
                      ? `${r.label} ${formatPercentage(latest.rateBasisPoints)}`
                      : r.label;
                  })
                  .join(" | ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : data ? (
        <>
          {/* Aggregated Savings KPI */}
          {data.worthItCount > 0 && (
            <Card className="border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="flex items-center gap-4 pt-6">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("aggregatedSavings")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(data.aggregatedAnnualSavings)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {t("year")}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.worthItCount} {t("loansWorthIt")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-Loan Table */}
          {data.perLoan.length > 0 ? (
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">{t("perLoanAnalysis")}</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">{t("property")}</th>
                        <th className="pb-2 text-right font-medium">
                          {t("currentRate")}
                        </th>
                        <th className="pb-2 text-right font-medium">
                          {t("monthlySavings")}
                        </th>
                        <th className="pb-2 text-right font-medium">
                          {t("totalSaved")}
                        </th>
                        <th className="pb-2 text-right font-medium">
                          {t("amortization")}
                        </th>
                        <th className="pb-2 text-center font-medium">
                          {t("worthIt")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perLoan.map((loan) => (
                        <tr
                          key={loan.loanId}
                          className="border-b last:border-0"
                        >
                          <td className="py-2">{loan.propertyName}</td>
                          <td className="py-2 text-right">
                            {formatPercentage(loan.currentInterestRate)}
                          </td>
                          <td
                            className={`py-2 text-right ${loan.monthlySavings > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(loan.monthlySavings)}
                          </td>
                          <td
                            className={`py-2 text-right ${loan.interestSaved > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(loan.interestSaved)}
                          </td>
                          <td className="py-2 text-right">
                            {loan.amortizationYears !== null
                              ? `${loan.amortizationYears} ${t("years")}`
                              : "-"}
                          </td>
                          <td className="py-2 text-center">
                            {loan.worthIt ? (
                              <CheckCircle className="mx-auto h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="mx-auto h-5 w-5 text-red-400" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("noLoans")}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
