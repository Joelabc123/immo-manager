"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Check, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardToolbarProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onOpenCatalog: () => void;
  onReset: () => void;
}

export function DashboardToolbar({
  isEditing,
  onToggleEdit,
  onOpenCatalog,
  onReset,
}: DashboardToolbarProps) {
  const t = useTranslations("dashboard.toolbar");
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    if (confirmReset) {
      onReset();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isEditing && (
        <>
          <Button variant="outline" size="sm" onClick={onOpenCatalog}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addWidget")}
          </Button>
          <Button
            variant={confirmReset ? "destructive" : "outline"}
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {confirmReset ? t("confirmReset") : t("reset")}
          </Button>
        </>
      )}
      <Button
        variant={isEditing ? "default" : "outline"}
        size="sm"
        onClick={onToggleEdit}
      >
        {isEditing ? (
          <>
            <Check className="mr-1.5 h-4 w-4" />
            {t("done")}
          </>
        ) : (
          <>
            <Pencil className="mr-1.5 h-4 w-4" />
            {t("edit")}
          </>
        )}
      </Button>
    </div>
  );
}
