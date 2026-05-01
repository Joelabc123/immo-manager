"use client";

import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiGenerateButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  size?: "icon-sm" | "icon";
}

/**
 * Reusable "AI generate" button. Shows a Bot icon (or spinner while loading).
 * Used in the TaskDialog (auto-fill title/description from email) and the
 * ReplyEditor toolbar (auto-draft reply).
 */
export function AiGenerateButton({
  onClick,
  loading = false,
  disabled = false,
  title,
  className,
  size = "icon-sm",
}: AiGenerateButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={title}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bot className="h-4 w-4" />
      )}
    </Button>
  );
}
