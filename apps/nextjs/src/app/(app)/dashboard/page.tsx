"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PencilIcon,
  PlusIcon,
  CheckIcon,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import type { Layout, LayoutItem } from "react-grid-layout";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { BentoGrid } from "@/components/dashboard/bento/bento-grid";
import { BentoWidget } from "@/components/dashboard/bento/bento-widget";
import {
  WidgetCatalogSheet,
  type CatalogEntry,
} from "@/components/dashboard/bento/widget-catalog-sheet";
import { PresetManager } from "@/components/dashboard/bento/preset-manager";
import {
  WIDGET_SIZE_VARIANTS,
  type DashboardLayout,
  type DashboardPreset,
  type WidgetInstance,
} from "@repo/shared/types";

const AUTOSAVE_DELAY_MS = 800;
const DROP_PLACEHOLDER_ID = "__drop__";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tb = useTranslations("dashboard.bento");
  const utils = trpc.useUtils();

  const presetsQuery = trpc.dashboardPresets.list.useQuery();

  const updateMutation = trpc.dashboardPresets.update.useMutation({
    onSuccess: () => {
      utils.dashboardPresets.list.invalidate();
    },
  });
  const createMutation = trpc.dashboardPresets.create.useMutation({
    onSuccess: (preset) => {
      utils.dashboardPresets.list.invalidate();
      setActivePresetId(preset.id);
    },
  });
  const renameMutation = trpc.dashboardPresets.rename.useMutation({
    onSuccess: () => utils.dashboardPresets.list.invalidate(),
  });
  const deleteMutation = trpc.dashboardPresets.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.dashboardPresets.list.invalidate();
      if (activePresetId === variables.id) setActivePresetId(null);
    },
  });
  const duplicateMutation = trpc.dashboardPresets.duplicate.useMutation({
    onSuccess: (preset) => {
      utils.dashboardPresets.list.invalidate();
      setActivePresetId(preset.id);
    },
  });
  const setDefaultMutation = trpc.dashboardPresets.setDefault.useMutation({
    onSuccess: () => utils.dashboardPresets.list.invalidate(),
  });
  const resetDefaultMutation = trpc.dashboardPresets.resetDefault.useMutation({
    onSuccess: (preset) => {
      utils.dashboardPresets.list.invalidate();
      setActivePresetId(preset.id);
      setDraftWidgets(null);
    },
  });

  const presets: DashboardPreset[] = useMemo(
    () => presetsQuery.data ?? [],
    [presetsQuery.data],
  );

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [draftWidgets, setDraftWidgets] = useState<WidgetInstance[] | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [droppingItem, setDroppingItem] = useState<LayoutItem | undefined>();
  const pendingEntryRef = useRef<CatalogEntry | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!presets.length) return;
    if (activePresetId && presets.some((p) => p.id === activePresetId)) {
      return;
    }
    const def = presets.find((p) => p.isDefault) ?? presets[0];
    setActivePresetId(def.id);
  }, [presets, activePresetId]);

  const active = useMemo(
    () => presets.find((p) => p.id === activePresetId) ?? null,
    [presets, activePresetId],
  );

  const widgets: WidgetInstance[] = useMemo(() => {
    if (draftWidgets) return draftWidgets;
    return active?.layout.widgets ?? [];
  }, [draftWidgets, active]);

  // Refs for stable access in callbacks (avoids stale closures)
  const widgetsRef = useRef(widgets);
  const activeRef = useRef(active);
  useEffect(() => {
    widgetsRef.current = widgets;
    activeRef.current = active;
  });

  const scheduleSave = useCallback(
    (nextWidgets: WidgetInstance[]) => {
      if (!active) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const layout: DashboardLayout = {
          widgets: nextWidgets,
          version: 5,
        };
        updateMutation.mutate({ id: active.id, layout });
      }, AUTOSAVE_DELAY_MS);
    },
    [active, updateMutation],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const commitWidgets = useCallback(
    (updater: (prev: WidgetInstance[]) => WidgetInstance[]) => {
      const next = updater(widgetsRef.current);
      setDraftWidgets(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const handleLayoutChange = useCallback(
    (nextWidgets: WidgetInstance[]) => {
      commitWidgets(() => nextWidgets);
    },
    [commitWidgets],
  );

  const handleRemove = useCallback(
    (id: string) => {
      commitWidgets((prev) => prev.filter((w) => w.id !== id));
    },
    [commitWidgets],
  );

  const handleCatalogDragStart = useCallback((entry: CatalogEntry) => {
    pendingEntryRef.current = entry;
    setDroppingItem({
      i: DROP_PLACEHOLDER_ID,
      x: 0,
      y: 0,
      w: entry.cols,
      h: entry.rows,
    });
    setIsDragging(true);
  }, []);

  const handleCatalogDragEnd = useCallback(() => {
    // Defer cleanup so the grid's onDrop handler can still read pendingEntryRef
    // (drop fires before dragend per spec, but setTimeout guarantees ordering)
    setTimeout(() => {
      pendingEntryRef.current = null;
      setDroppingItem(undefined);
      setIsDragging(false);
    }, 0);
  }, []);

  const handleDrop = useCallback(
    (_layout: Layout, item: LayoutItem | undefined) => {
      const entry = pendingEntryRef.current;
      pendingEntryRef.current = null;
      setDroppingItem(undefined);
      setIsDragging(false);
      if (!entry || !item) return;
      const size = WIDGET_SIZE_VARIANTS[entry.variant];
      const newWidget: WidgetInstance = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: entry.type,
        variant: entry.variant,
        position: { x: item.x, y: item.y },
        size: { cols: size.cols, rows: size.rows },
      };
      commitWidgets((prev) => [...prev, newWidget]);
    },
    [commitWidgets],
  );

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => {
      const next = !prev;
      if (!next) {
        // Flush any pending debounced save immediately
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        const a = activeRef.current;
        const w = widgetsRef.current;
        if (a && w.length > 0) {
          updateMutation.mutate({
            id: a.id,
            layout: { widgets: w, version: 5 },
          });
        }
        setCatalogOpen(false);
        setDraftWidgets(null);
      }
      return next;
    });
  }, [updateMutation]);

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
    setDraftWidgets(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <PresetManager
            presets={presets}
            activePresetId={activePresetId}
            onSelect={handleSelectPreset}
            onCreate={(name) =>
              createMutation.mutate({
                name,
                layout: { widgets: widgetsRef.current, version: 5 },
              })
            }
            onRename={(id, name) => renameMutation.mutate({ id, name })}
            onDuplicate={(id, name) => duplicateMutation.mutate({ id, name })}
            onDelete={(id) => deleteMutation.mutate({ id })}
            onSetDefault={(id) => setDefaultMutation.mutate({ id })}
            disabled={presetsQuery.isLoading}
          />
          {isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCatalogOpen((v) => !v)}
            >
              <PlusIcon /> {tb("addWidget")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (resetDefaultMutation.isPending) return;
              if (
                typeof window !== "undefined" &&
                !window.confirm(tb("resetConfirm"))
              ) {
                return;
              }
              resetDefaultMutation.mutate();
            }}
            disabled={resetDefaultMutation.isPending}
          >
            <ArrowClockwise /> {tb("reset")}
          </Button>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={handleToggleEdit}
          >
            {isEditing ? <CheckIcon /> : <PencilIcon />}
            {isEditing ? tb("done") : tb("edit")}
          </Button>
        </div>
      </div>

      {presetsQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : presetsQuery.isError ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => presetsQuery.refetch()}
          >
            <ArrowClockwise className="mr-2 h-4 w-4" />
            {t("retry")}
          </Button>
        </div>
      ) : (
        <BentoGrid
          widgets={widgets}
          isEditing={isEditing}
          isDragging={isDragging}
          onWidgetsReorder={handleLayoutChange}
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
          onDrop={handleDrop}
          droppingItem={droppingItem}
          renderWidget={(widget) => (
            <BentoWidget
              widget={widget}
              isEditing={isEditing}
              onRemove={handleRemove}
            />
          )}
        />
      )}

      <WidgetCatalogSheet
        open={isEditing && catalogOpen}
        onOpenChange={(open) => {
          if (!open) setCatalogOpen(false);
        }}
        onDragStartEntry={handleCatalogDragStart}
        onDragEndEntry={handleCatalogDragEnd}
      />
    </div>
  );
}
