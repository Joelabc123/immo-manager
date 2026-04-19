"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon, StarIcon, XIcon } from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WIDGET_DEFINITIONS,
  WIDGET_SIZE_VARIANTS,
  WIDGET_CATEGORIES,
  type WidgetType,
  type WidgetSizeVariant,
  type WidgetCategory,
  type WidgetDefinition,
} from "@repo/shared/types";

const FAVORITES_KEY = "dashboard:favorites";

interface CatalogEntry {
  key: string;
  type: WidgetType;
  variant: WidgetSizeVariant;
  definition: WidgetDefinition;
  cols: number;
  rows: number;
}

interface WidgetCatalogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDragStartEntry: (entry: CatalogEntry) => void;
  onDragEndEntry: () => void;
}

function buildEntries(): CatalogEntry[] {
  const list: CatalogEntry[] = [];
  for (const definition of Object.values(WIDGET_DEFINITIONS)) {
    for (const variant of definition.availableVariants) {
      const size = WIDGET_SIZE_VARIANTS[variant];
      list.push({
        key: `${definition.type}:${variant}`,
        type: definition.type,
        variant,
        definition,
        cols: size.cols,
        rows: size.rows,
      });
    }
  }
  list.sort((a, b) => {
    if (a.definition.category !== b.definition.category) {
      return a.definition.category.localeCompare(b.definition.category);
    }
    if (a.definition.i18nKey !== b.definition.i18nKey) {
      return a.definition.i18nKey.localeCompare(b.definition.i18nKey);
    }
    return a.cols * a.rows - b.cols * b.rows;
  });
  return list;
}

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        return new Set(parsed);
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  const toggle = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}

export function WidgetCatalogSheet({
  open,
  onOpenChange,
  onDragStartEntry,
  onDragEndEntry,
}: WidgetCatalogSheetProps) {
  const t = useTranslations("dashboard.bento");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WidgetCategory | "all">("all");
  const [showFavorites, setShowFavorites] = useState(false);
  const { favorites, toggle } = useFavorites();

  // Resizable sheet height via drag handle
  const [sheetHeight, setSheetHeight] = useState(55); // vh
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: sheetHeight };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [sheetHeight],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const deltaVh =
        ((e.clientY - dragRef.current.startY) / window.innerHeight) * 100;
      const next = Math.min(70, Math.max(15, dragRef.current.startH - deltaVh));
      setSheetHeight(next);
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const entries = useMemo(() => buildEntries(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (showFavorites && !favorites.has(e.key)) return false;
      if (category !== "all" && e.definition.category !== category) {
        return false;
      }
      if (q) {
        const name = t(`widget.${e.definition.i18nKey}` as never) as string;
        if (!name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, category, showFavorites, favorites, t]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl p-0"
        showOverlay={false}
        showCloseButton={false}
        style={{ maxHeight: `${sheetHeight}vh` }}
      >
        {/* Drag handle */}
        <div
          className="flex cursor-row-resize items-center justify-center py-2 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="pb-3">
          <SheetTitle>{t("catalog.title")}</SheetTitle>
          <SheetDescription>{t("catalog.description")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-6 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("catalog.searchPlaceholder")}
              className="pl-9"
            />
            {query ? (
              <Button
                size="icon-xs"
                variant="ghost"
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => setQuery("")}
                aria-label={t("catalog.clearSearch")}
              >
                <XIcon />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <CategoryChip
              active={category === "all"}
              label={t("catalog.categories.all")}
              onClick={() => setCategory("all")}
            />
            {Object.values(WIDGET_CATEGORIES).map((c) => (
              <CategoryChip
                key={c}
                active={category === c}
                label={t(`catalog.categories.${c}` as never) as string}
                onClick={() => setCategory(c)}
              />
            ))}
            <CategoryChip
              active={showFavorites}
              label={t("catalog.favorites")}
              onClick={() => setShowFavorites((v) => !v)}
              icon={<StarIcon weight={showFavorites ? "fill" : "regular"} />}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 pb-6">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {t("catalog.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((entry) => (
                <CatalogTile
                  key={entry.key}
                  entry={entry}
                  isFavorite={favorites.has(entry.key)}
                  onToggleFavorite={() => toggle(entry.key)}
                  onDragStart={() => onDragStartEntry(entry)}
                  onDragEnd={onDragEndEntry}
                  labelName={
                    t(`widget.${entry.definition.i18nKey}` as never) as string
                  }
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

function CatalogTile({
  entry,
  isFavorite,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  labelName,
}: {
  entry: CatalogEntry;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  labelName: string;
}) {
  return (
    <div
      className="group relative flex cursor-grab flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/50 active:cursor-grabbing"
      draggable
      unselectable="on"
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", entry.key);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {labelName}
          </p>
          <p className="text-xs text-muted-foreground">
            {entry.cols}×{entry.rows}
          </p>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={isFavorite}
        >
          <StarIcon
            weight={isFavorite ? "fill" : "regular"}
            className={cn(isFavorite && "text-primary")}
          />
        </Button>
      </div>
      <div
        className="relative h-14 w-full overflow-hidden rounded-md bg-muted/50"
        style={{
          aspectRatio: `${entry.cols} / ${entry.rows}`,
          maxHeight: 80,
        }}
        aria-hidden
      >
        <Badge
          variant="outline"
          className="absolute bottom-1 right-1 text-[10px]"
        >
          {entry.variant}
        </Badge>
      </div>
    </div>
  );
}

export type { CatalogEntry };
