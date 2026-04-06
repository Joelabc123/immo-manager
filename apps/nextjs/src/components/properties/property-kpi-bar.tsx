"use client";

import { useTranslations } from "next-intl";
import {
  Building2,
  Home,
  TrendingUp,
  DollarSign,
  Euro,
  SwissFranc,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/hooks/use-currency";

const CURRENCY_ICONS: Record<string, LucideIcon> = {
  EUR: Euro,
  USD: DollarSign,
  CHF: SwissFranc,
};

interface PropertyKpiBarProps {
  totalProperties: number;
  totalUnits: number;
  totalMarketValue: number;
  totalPurchasePrice: number;
  isLoading?: boolean;
}

export function PropertyKpiBar({
  totalProperties,
  totalUnits,
  totalMarketValue,
  totalPurchasePrice,
  isLoading,
}: PropertyKpiBarProps) {
  const t = useTranslations("properties.kpi");
  const { currency, formatCurrency } = useCurrency();

  const PurchasePriceIcon = CURRENCY_ICONS[currency] ?? DollarSign;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
      label: t("properties"),
      value: totalProperties.toString(),
      icon: Building2,
    },
    {
      label: t("units"),
      value: totalUnits.toString(),
      icon: Home,
    },
    {
      label: t("marketValue"),
      value: formatCurrency(totalMarketValue),
      icon: TrendingUp,
    },
    {
      label: t("purchasePrice"),
      value: formatCurrency(totalPurchasePrice),
      icon: PurchasePriceIcon,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <kpi.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-sm font-semibold">{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
