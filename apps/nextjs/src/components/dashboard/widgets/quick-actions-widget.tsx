"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Receipt, Upload, Building2 } from "lucide-react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActionsWidget(_props: {
  config?: Record<string, unknown>;
}) {
  const t = useTranslations("dashboard.widgets.quickActions");
  const router = useRouter();

  const actions = [
    {
      label: t("addProperty"),
      icon: Building2,
      onClick: () => router.push("/properties?action=create"),
    },
    {
      label: t("addExpense"),
      icon: Receipt,
      onClick: () => router.push("/properties?action=expense"),
    },
    {
      label: t("uploadDocument"),
      icon: Upload,
      onClick: () => router.push("/documents?action=upload"),
    },
    {
      label: t("addTenant"),
      icon: Plus,
      onClick: () => router.push("/tenants?action=create"),
    },
  ];

  return (
    <>
      <CardHeader>
        <p className="text-sm font-medium">{t("name")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-1.5 py-3"
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </>
  );
}
