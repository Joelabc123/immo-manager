"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardDndProvider } from "@/components/dashboard/dashboard-dnd-provider";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { WidgetCatalog } from "@/components/dashboard/widget-catalog";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { getWidgetComponent } from "@/components/dashboard/widgets";
import {
  WIDGET_DEFINITIONS,
  DEFAULT_DASHBOARD_LAYOUT,
} from "@repo/shared/types";
import type {
  WidgetInstance,
  WidgetSize,
  WidgetType,
  DashboardLayout,
} from "@repo/shared/types";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<WidgetInstance[] | null>(
    null,
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();

  const { data: savedLayout } = trpc.dashboard.getDashboardLayout.useQuery();

  const saveMutation = trpc.dashboard.saveDashboardLayout.useMutation();
  const resetMutation = trpc.dashboard.resetDashboardLayout.useMutation({
    onSuccess: () => {
      setLocalWidgets(DEFAULT_DASHBOARD_LAYOUT.widgets);
      utils.dashboard.getDashboardLayout.invalidate();
    },
  });

  // Use local state if user has made changes, otherwise use server data
  const serverWidgets = savedLayout
    ? (savedLayout as DashboardLayout).widgets
    : [];
  const widgets = localWidgets ?? serverWidgets;

  // Auto-save with debounce
  const scheduleSave = useCallback(
    (updatedWidgets: WidgetInstance[]) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate({
          layout: { widgets: updatedWidgets, version: 1 },
        });
      }, 1000);
    },
    [saveMutation],
  );

  const updateWidgets = useCallback(
    (updater: (prev: WidgetInstance[]) => WidgetInstance[]) => {
      const current = localWidgets ?? serverWidgets;
      const next = updater(current);
      setLocalWidgets(next);
      scheduleSave(next);
    },
    [scheduleSave, localWidgets, serverWidgets],
  );

  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      updateWidgets((prev) => {
        const activeIndex = prev.findIndex((w) => w.id === activeId);
        const overIndex = prev.findIndex((w) => w.id === overId);
        if (activeIndex === -1 || overIndex === -1) return prev;

        const activeWidget = prev[activeIndex];
        const overWidget = prev[overIndex];

        return prev.map((w, i) => {
          if (i === activeIndex) return { ...w, position: overWidget.position };
          if (i === overIndex) return { ...w, position: activeWidget.position };
          return w;
        });
      });
    },
    [updateWidgets],
  );

  const handleRemove = useCallback(
    (widgetId: string) => {
      updateWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    },
    [updateWidgets],
  );

  const handleResize = useCallback(
    (widgetId: string, size: WidgetSize) => {
      updateWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, size } : w)),
      );
    },
    [updateWidgets],
  );

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const definition = WIDGET_DEFINITIONS[type];
      const maxY = widgets.reduce(
        (max, w) => Math.max(max, w.position.y + w.size.rows),
        0,
      );

      const newWidget: WidgetInstance = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: 0, y: maxY },
        size: { ...definition.defaultSize },
      };

      updateWidgets((prev) => [...prev, newWidget]);
    },
    [widgets, updateWidgets],
  );

  const handleReset = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
    if (isEditing) {
      setCatalogOpen(false);
    }
  }, [isEditing]);

  const renderWidget = useCallback(
    (widget: WidgetInstance) => {
      const WidgetComponent = getWidgetComponent(widget.type);

      return (
        <WidgetWrapper
          widget={widget}
          isEditing={isEditing}
          onRemove={handleRemove}
          onResize={handleResize}
        >
          <WidgetComponent config={widget.config} />
        </WidgetWrapper>
      );
    },
    [isEditing, handleRemove, handleResize],
  );

  const renderDragOverlay = useCallback((widget: WidgetInstance) => {
    const definition = WIDGET_DEFINITIONS[widget.type];
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {definition.i18nKey}
      </span>
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <DashboardToolbar
          isEditing={isEditing}
          onToggleEdit={handleToggleEdit}
          onOpenCatalog={() => setCatalogOpen(true)}
          onReset={handleReset}
        />
      </div>

      <DashboardDndProvider
        widgets={widgets}
        onReorder={handleReorder}
        isEditing={isEditing}
        renderDragOverlay={renderDragOverlay}
      >
        <DashboardGrid
          widgets={widgets}
          renderWidget={renderWidget}
          isEditing={isEditing}
        />
      </DashboardDndProvider>

      <WidgetCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        currentWidgets={widgets}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
}
