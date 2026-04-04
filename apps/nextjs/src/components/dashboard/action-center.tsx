"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  CalendarClock,
  FileWarning,
  Lightbulb,
  PiggyBank,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc";
import type { ActionCenterItem } from "@repo/shared/calculations";

const RULE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  vacancy: AlertTriangle,
  negative_cashflow: TrendingDown,
  overdue_rent: Clock,
  interest_binding_expiry: CalendarClock,
  contract_expiry: FileWarning,
  rent_potential: Lightbulb,
  special_repayment: PiggyBank,
};

function ActionItemCard({
  item,
  onDismiss,
}: {
  item: ActionCenterItem;
  onDismiss: (item: ActionCenterItem) => void;
}) {
  const t = useTranslations("dashboard.actionCenter.rules");
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const Icon = RULE_ICONS[item.ruleType] ?? AlertTriangle;

  const handleClick = () => {
    if (item.entityType === "property") {
      router.push(`/properties/${item.entityId}`);
    } else if (item.entityType === "tenant") {
      router.push(`/tenants/${item.entityId}`);
    }
  };

  return (
    <div
      className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={handleClick}
    >
      <div
        className={`rounded-md p-1.5 ${
          item.severity === "risk"
            ? "bg-red-100 text-red-600"
            : "bg-blue-100 text-blue-600"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{t(`${item.ruleType}.title`)}</p>
          <Badge
            variant={item.severity === "risk" ? "destructive" : "secondary"}
          >
            {formatCurrency(item.impactCents)}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.description}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {item.propertyName}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(item);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ActionCenter() {
  const t = useTranslations("dashboard.actionCenter");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.dashboard.getActionCenterItems.useQuery();

  const dismissMutation = trpc.dashboard.dismissActionItem.useMutation({
    onSuccess: () => {
      utils.dashboard.getActionCenterItems.invalidate();
    },
  });

  const handleDismiss = (item: ActionCenterItem) => {
    dismissMutation.mutate({
      ruleType: item.ruleType,
      entityId: item.entityId,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <p className="text-sm font-medium">{t("title")}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const risks = data?.risks ?? [];
  const opportunities = data?.opportunities ?? [];
  const totalItems = risks.length + opportunities.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{t("title")}</p>
          {totalItems > 0 && <Badge variant="secondary">{totalItems}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {totalItems === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-sm text-muted-foreground">
            {t("noItems")}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Risks column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-red-600">
                  {t("risks")}
                </h3>
                {risks.length > 0 && (
                  <Badge variant="destructive">{risks.length}</Badge>
                )}
              </div>
              {risks.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noRisks")}</p>
              ) : (
                <div className="space-y-2">
                  {risks.map((item, index) => (
                    <ActionItemCard
                      key={`${item.ruleType}-${item.entityId}-${index}`}
                      item={item}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-blue-600">
                  {t("opportunities")}
                </h3>
                {opportunities.length > 0 && (
                  <Badge variant="secondary">{opportunities.length}</Badge>
                )}
              </div>
              {opportunities.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("noOpportunities")}
                </p>
              ) : (
                <div className="space-y-2">
                  {opportunities.map((item, index) => (
                    <ActionItemCard
                      key={`${item.ruleType}-${item.entityId}-${index}`}
                      item={item}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
