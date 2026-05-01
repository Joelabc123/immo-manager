"use client";

import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface AiOverwritePopoverProps {
  /**
   * Render the trigger button. When `hasContent` is true, the trigger is
   * wrapped so a click opens the popover. When false, the consumer's own
   * `onClick` (returned by this render function) invokes `onConfirm` directly.
   */
  children: (props: { onClick: () => void }) => ReactNode;
  /** Whether existing content would be overwritten. When false, confirm is skipped. */
  hasContent: boolean;
  /** Called when the user confirms the overwrite OR when there is nothing to overwrite. */
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

/**
 * Inline confirmation popover anchored to an action trigger. Replaces the
 * native window.confirm() flow when an AI generation would overwrite existing
 * user-entered content. When there is nothing to overwrite, clicking the
 * trigger invokes the action directly without showing the popover.
 */
export function AiOverwritePopover({
  children,
  hasContent,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: AiOverwritePopoverProps) {
  const [open, setOpen] = useState(false);

  if (!hasContent) {
    return <>{children({ onClick: onConfirm })}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(triggerProps) => (
          <span {...triggerProps}>
            {children({ onClick: () => setOpen(true) })}
          </span>
        )}
      />
      <PopoverContent align="end" side="bottom" className="w-72 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
