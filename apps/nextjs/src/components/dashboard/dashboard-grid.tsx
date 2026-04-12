"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import type { WidgetInstance } from "@repo/shared/types";

interface DashboardGridProps {
  widgets: WidgetInstance[];
  renderWidget: (widget: WidgetInstance) => ReactNode;
  isEditing: boolean;
}

export function DashboardGrid({
  widgets,
  renderWidget,
  isEditing,
}: DashboardGridProps) {
  return (
    <div
      className="relative grid auto-rows-[minmax(120px,auto)] gap-4"
      style={{
        gridTemplateColumns: "repeat(12, 1fr)",
      }}
    >
      {isEditing && <GridOverlay />}
      {widgets.map((widget) => (
        <motion.div
          key={widget.id}
          layout
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          style={{
            gridColumn: `${widget.position.x + 1} / span ${widget.size.cols}`,
            gridRow: `${widget.position.y + 1} / span ${widget.size.rows}`,
          }}
        >
          {renderWidget(widget)}
        </motion.div>
      ))}
    </div>
  );
}

function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 grid auto-rows-[minmax(120px,auto)] gap-4"
      style={{
        gridTemplateColumns: "repeat(12, 1fr)",
      }}
    >
      {Array.from({ length: 48 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-dashed border-muted-foreground/20"
        />
      ))}
    </div>
  );
}
