"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatPercentage } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface CashflowSectionProps {
  propertyId: string;
}

export function CashflowSection({ propertyId }: CashflowSectionProps) {
  const t = useTranslations("cashflow");
  const { formatCurrency } = useCurrency();

  // Gather data from various routers for the calculation
  const { data: loans } = trpc.loans.list.useQuery({ propertyId });
  const { data: expenseSummary } = trpc.expenses.getSummary.useQuery({
    propertyId,
  });
  const { data: units } = trpc.rentalUnits.list.useQuery({ propertyId });
  const { data: property } = trpc.properties.getById.useQuery({
    id: propertyId,
  });

  // Calculate totals client-side from available data
  const totalLoanPayments =
    loans?.reduce((sum, loan) => sum + loan.monthlyPayment, 0) ?? 0;

  // Calculate total cold rent from active tenants across all units
  let totalColdRent = 0;
  if (units) {
    for (const unit of units) {
      if (unit.tenants) {
        for (const tenant of unit.tenants) {
          const isActive =
            !tenant.rentEnd || new Date(tenant.rentEnd) >= new Date();
          if (isActive) {
            totalColdRent += tenant.coldRent;
          }
        }
      }
    }
  }

  const nonApportionableExpenses = expenseSummary?.nonApportionable.total ?? 0;
  const monthlyExpenses = Math.round(nonApportionableExpenses / 12);

  const monthlyCashflow = totalColdRent - totalLoanPayments - monthlyExpenses;
  const annualCashflow = monthlyCashflow * 12;

  const grossYield =
    property && property.purchasePrice > 0
      ? Math.round(((totalColdRent * 12) / property.purchasePrice) * 10000)
      : 0;

  const isPositive = monthlyCashflow > 0;
  const isNegative = monthlyCashflow < 0;

  const isLoading = !loans || !expenseSummary || !units || !property;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Summary */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <CashflowStat
            label={t("totalRent")}
            value={formatCurrency(totalColdRent)}
            sublabel={t("perMonth")}
          />
          <CashflowStat
            label={t("loanPayments")}
            value={`-${formatCurrency(totalLoanPayments)}`}
            sublabel={t("perMonth")}
          />
          <CashflowStat
            label={t("expenses")}
            value={`-${formatCurrency(monthlyExpenses)}`}
            sublabel={t("perMonth")}
          />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t("cashflow")}</p>
            <p
              className={`text-xl font-bold ${
                isPositive
                  ? "text-green-600 dark:text-green-400"
                  : isNegative
                    ? "text-red-600 dark:text-red-400"
                    : ""
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : isNegative ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {formatCurrency(monthlyCashflow)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{t("perMonth")}</p>
          </div>
        </div>

        <Separator />

        {/* Annual & Yield */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">
              {t("annualCashflow")}:
            </span>{" "}
            <span className="font-medium">
              {formatCurrency(annualCashflow)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("grossYield")}:</span>{" "}
            <span className="font-medium">{formatPercentage(grossYield)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashflowStat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}
