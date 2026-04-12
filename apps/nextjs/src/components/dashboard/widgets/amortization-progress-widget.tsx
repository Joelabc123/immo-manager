"use client";

import { useTranslations } from "next-intl";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";

export function AmortizationProgressWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.amortizationProgress");
  const { formatCurrency } = useCurrency();
  const { data, isLoading } = trpc.dashboard.getAmortizationProgress.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
          {data.map((loan) => {
            const progress = Math.round(
              ((loan.originalAmount - loan.remainingBalance) /
                loan.originalAmount) *
                100,
            );

            return (
              <div key={loan.loanId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-muted-foreground">
                    {loan.bankName} - {loan.propertyName}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t("paid")}:{" "}
                    {formatCurrency(
                      loan.originalAmount - loan.remainingBalance,
                    )}
                  </span>
                  <span>
                    {t("remaining")}: {formatCurrency(loan.remainingBalance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
