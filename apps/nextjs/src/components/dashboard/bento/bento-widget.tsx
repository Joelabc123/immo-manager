"use client";

import { createElement } from "react";
import { useTranslations } from "next-intl";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getWidgetComponent } from "@/components/dashboard/widgets";
import type { WidgetInstance } from "@repo/shared/types";

interface BentoWidgetProps {
  widget: WidgetInstance;
  isEditing: boolean;
  onRemove: (id: string) => void;
}

export function BentoWidget({ widget, isEditing, onRemove }: BentoWidgetProps) {
  const t = useTranslations("dashboard.bento");

  return (
    <Card
      className={cn(
        "relative h-full w-full overflow-hidden p-4",
        isEditing && "cursor-grab active:cursor-grabbing select-none",
      )}
    >
      {isEditing ? (
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          className="absolute top-2 right-2 z-10 rounded-full shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(widget.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={t("remove")}
        >
          <XIcon weight="bold" />
        </Button>
      ) : null}
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden",
          [
            "action_center",
            "amortization_progress",
            "upcoming_deadlines",
          ].includes(widget.type) && "overflow-y-auto",
          isEditing && "pointer-events-none opacity-95",
        )}
      >
        {createElement(getWidgetComponent(widget.type), {
          config: widget.config,
          variant: widget.variant,
        })}
      </div>
    </Card>
  );
}
