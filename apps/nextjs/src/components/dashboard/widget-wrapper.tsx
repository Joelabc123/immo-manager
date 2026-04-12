"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Settings, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WidgetInstance, WidgetSize } from "@repo/shared/types";
import { WIDGET_DEFINITIONS } from "@repo/shared/types";

interface WidgetWrapperProps {
  widget: WidgetInstance;
  isEditing: boolean;
  children: ReactNode;
  isLoading?: boolean;
  onRemove: (widgetId: string) => void;
  onResize: (widgetId: string, size: WidgetSize) => void;
  onConfigure?: (widgetId: string) => void;
}

export function WidgetWrapper({
  widget,
  isEditing,
  children,
  isLoading,
  onRemove,
  onResize,
  onConfigure,
}: WidgetWrapperProps) {
  const t = useTranslations("dashboard.widgets");
  const definition = WIDGET_DEFINITIONS[widget.type];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as const),
  };

  const currentSizeIndex = definition.allowedSizes.findIndex(
    (s) => s.cols === widget.size.cols && s.rows === widget.size.rows,
  );

  const handleCycleSize = () => {
    const nextIndex = (currentSizeIndex + 1) % definition.allowedSizes.length;
    const nextSize = definition.allowedSizes[nextIndex];
    onResize(widget.id, nextSize);
  };

  const isSmallest = currentSizeIndex === 0;
  const isLargest = currentSizeIndex === definition.allowedSizes.length - 1;

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="h-full"
      >
        <Card
          className={`h-full transition-shadow ${
            isEditing ? "ring-2 ring-primary/20 hover:ring-primary/40" : ""
          } ${isDragging ? "shadow-2xl" : ""}`}
        >
          {isEditing && (
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <div className="flex items-center gap-1">
                <button
                  className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-muted-foreground">
                  {t(`${definition.i18nKey}.name`)}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCycleSize}
                  title={
                    isLargest
                      ? t("shrink")
                      : isSmallest
                        ? t("grow")
                        : t("resize")
                  }
                >
                  {isLargest ? (
                    <Minimize2 className="h-3 w-3" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                </Button>
                {onConfigure && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onConfigure(widget.id)}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onRemove(widget.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {isLoading ? (
            <CardContent>
              <Skeleton className="h-full min-h-[80px] w-full" />
            </CardContent>
          ) : (
            <div className="h-full overflow-auto">{children}</div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
