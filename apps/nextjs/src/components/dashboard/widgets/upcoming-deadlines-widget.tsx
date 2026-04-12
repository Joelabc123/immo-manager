"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, AlertTriangle, FileWarning } from "lucide-react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  interest_binding: CalendarClock,
  contract_expiry: FileWarning,
  rent_adjustment: AlertTriangle,
};

const TYPE_COLORS: Record<string, string> = {
  interest_binding: "bg-orange-100 text-orange-600",
  contract_expiry: "bg-red-100 text-red-600",
  rent_adjustment: "bg-blue-100 text-blue-600",
};

export function UpcomingDeadlinesWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.upcomingDeadlines");
  const { data, isLoading } = trpc.dashboard.getUpcomingDeadlines.useQuery();

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <p className="text-sm font-medium">{t("name")}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
        <div className="space-y-2">
          {data.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? CalendarClock;
            const colorClass =
              TYPE_COLORS[item.type] ?? "bg-muted text-muted-foreground";

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-2.5"
              >
                <div className={`rounded-md p-1.5 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.propertyName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{item.date}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.daysRemaining} {t("days")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </>
  );
}
