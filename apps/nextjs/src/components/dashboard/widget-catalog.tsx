"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  Activity,
  TrendingUp,
  PieChart,
  AlertTriangle,
  BarChart,
  Home,
  CalendarClock,
  Clock,
  Receipt,
  BarChart2,
  Scale,
  Target,
  Zap,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WIDGET_DEFINITIONS, WIDGET_TYPES } from "@repo/shared/types";
import type { WidgetType, WidgetInstance } from "@repo/shared/types";

const WIDGET_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Activity,
  TrendingUp,
  PieChart,
  AlertTriangle,
  BarChart,
  Home,
  CalendarClock,
  Clock,
  Receipt,
  BarChart2,
  Scale,
  Target,
  Zap,
};

interface WidgetCatalogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWidgets: WidgetInstance[];
  onAddWidget: (type: WidgetType) => void;
}

export function WidgetCatalog({
  open,
  onOpenChange,
  currentWidgets,
  onAddWidget,
}: WidgetCatalogProps) {
  const t = useTranslations("dashboard");

  const widgetTypes = Object.values(WIDGET_TYPES);

  const getWidgetCount = (type: WidgetType): number => {
    return currentWidgets.filter((w) => w.type === type).length;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] overflow-y-auto sm:w-[420px]"
      >
        <SheetHeader>
          <SheetTitle>{t("catalog.title")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {widgetTypes.map((type) => {
            const definition = WIDGET_DEFINITIONS[type];
            const Icon = WIDGET_ICONS[definition.icon] ?? BarChart3;
            const count = getWidgetCount(type);

            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {t(`widgets.${definition.i18nKey}.name`)}
                    </p>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {count}x
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(`widgets.${definition.i18nKey}.description`)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">
                    {definition.defaultSize.cols}x{definition.defaultSize.rows}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onAddWidget(type)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
