"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import { cn } from "@/lib/utils";
import { WIDGET_SIZE_VARIANTS } from "@repo/shared/types";
import type { WidgetInstance } from "@repo/shared/types";

// Breakpoints are chosen so that a typical desktop layout (viewport >= 1024px)
// always resolves to `lg`. The previous `lg: 1200` boundary sat almost
// exactly on the measured content width (viewport minus sidebar), which
// caused ResizeObserver jitter to flip between `lg` (12 cols) and `md`
// (8 cols) on every render — visibly shuffling widgets around.
const BREAKPOINTS = { lg: 820, md: 600, sm: 420, xs: 0 } as const;
const COLS = { lg: 12, md: 8, sm: 4, xs: 2 } as const;
const ROW_HEIGHT = 96;
const MARGIN: readonly [number, number] = [16, 16];
const CONTAINER_PADDING: readonly [number, number] = [0, 0];

type Breakpoint = keyof typeof BREAKPOINTS;

function layoutSignature(widgets: WidgetInstance[]): string {
  // Stable fingerprint based only on identity + geometry so that unrelated
  // re-renders (e.g. tRPC refetches producing a new array reference with
  // identical content) do not cause react-grid-layout to rebuild and
  // visibly re-apply widget positions.
  return widgets
    .map(
      (w) =>
        `${w.id}:${w.position.x},${w.position.y}:${w.size.cols}x${w.size.rows}`,
    )
    .join("|");
}

interface BentoGridProps {
  widgets: WidgetInstance[];
  isEditing: boolean;
  isDragging: boolean;
  onWidgetsReorder: (widgets: WidgetInstance[]) => void;
  onDragStart: () => void;
  onDragStop: () => void;
  onDrop: (layout: Layout, item: LayoutItem | undefined) => void;
  droppingItem?: LayoutItem;
  renderWidget: (widget: WidgetInstance) => React.ReactNode;
}

function buildLayout(widgets: WidgetInstance[], cols: number): Layout {
  return widgets.map((w) => {
    const width = Math.min(w.size.cols, cols);
    return {
      i: w.id,
      x: Math.min(w.position.x, Math.max(0, cols - width)),
      y: w.position.y,
      w: width,
      h: w.size.rows,
      static: false,
    };
  });
}

function buildResponsiveLayouts(
  widgets: WidgetInstance[],
): Record<Breakpoint, Layout> {
  return {
    lg: buildLayout(widgets, COLS.lg),
    md: buildLayout(widgets, COLS.md),
    sm: buildLayout(widgets, COLS.sm),
    xs: buildLayout(widgets, COLS.xs),
  };
}

/**
 * Apply the RGL layout positions back to our widget instances.
 * Only creates new objects when something actually changed.
 */
function applyLayoutToWidgets(
  layout: Layout,
  widgets: WidgetInstance[],
): WidgetInstance[] | null {
  const byId = new Map(layout.map((item) => [item.i, item]));
  let changed = false;
  const next = widgets.map((w) => {
    const item = byId.get(w.id);
    if (!item) return w;
    if (
      item.x === w.position.x &&
      item.y === w.position.y &&
      item.w === w.size.cols &&
      item.h === w.size.rows
    ) {
      return w;
    }
    changed = true;
    return {
      ...w,
      position: { x: item.x, y: item.y },
      size: { cols: item.w, rows: item.h },
    };
  });
  return changed ? next : null;
}

export function BentoGrid({
  widgets,
  isEditing,
  isDragging,
  onWidgetsReorder,
  onDragStart,
  onDragStop,
  onDrop,
  droppingItem,
  renderWidget,
}: BentoGridProps) {
  const { width, containerRef, mounted } = useContainerWidth({
    initialWidth: 1200,
  });

  const signature = layoutSignature(widgets);
  const layouts = useMemo(
    () => buildResponsiveLayouts(widgets),
    // Intentionally keyed on the stable signature rather than the widgets
    // reference to avoid rebuilding layouts after refetches that produce
    // an equivalent array with a new identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  // Keep a ref to the latest RGL layout so we can read it in onDragStop.
  const latestLayoutRef = useRef<Layout | null>(null);

  // Only store — never call setState here. This avoids the render loop.
  const handleLayoutChange = useCallback((current: Layout) => {
    latestLayoutRef.current = current;
  }, []);

  // Sync positions back to parent only when the user finishes a drag.
  const handleDragStop: BentoGridProps["onDragStop"] = useCallback(() => {
    onDragStop();
    const layout = latestLayoutRef.current;
    if (!layout) return;
    const next = applyLayoutToWidgets(layout, widgets);
    if (next) onWidgetsReorder(next);
  }, [onDragStop, widgets, onWidgetsReorder]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full transition-[background-image] duration-200",
        isDragging && "bento-grid-dot-pattern",
      )}
    >
      {mounted ? (
        <ResponsiveGridLayout<Breakpoint>
          breakpoints={BREAKPOINTS}
          cols={COLS}
          layouts={layouts}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={CONTAINER_PADDING}
          width={width}
          compactor={verticalCompactor}
          resizeConfig={{ enabled: false, handles: [] }}
          dragConfig={{
            enabled: isEditing,
            bounded: false,
            threshold: 4,
          }}
          dropConfig={{
            enabled: isEditing,
            defaultItem: {
              w: WIDGET_SIZE_VARIANTS.md.cols,
              h: WIDGET_SIZE_VARIANTS.md.rows,
            },
          }}
          droppingItem={droppingItem}
          onLayoutChange={handleLayoutChange}
          onDragStart={onDragStart}
          onDragStop={handleDragStop}
          onDrop={onDrop}
          onDropDragOver={() => undefined}
        >
          {widgets.map((widget) => (
            <div
              key={widget.id}
              data-widget-id={widget.id}
              className={cn(
                "bento-grid-item",
                isEditing && !isDragging && "bento-jiggle",
              )}
            >
              {renderWidget(widget)}
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
}
