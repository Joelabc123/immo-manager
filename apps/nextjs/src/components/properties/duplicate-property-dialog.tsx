"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DuplicatePropertyDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicatePropertyDialog({
  propertyId,
  open,
  onOpenChange,
}: DuplicatePropertyDialogProps) {
  const t = useTranslations("properties");
  const utils = trpc.useUtils();
  const [includeUnits, setIncludeUnits] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);

  const duplicateMutation = trpc.properties.duplicate.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      utils.properties.getAggregatedKpis.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("duplicateProperty")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("duplicateDescription")}
          </p>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeUnits}
                onChange={(e) => setIncludeUnits(e.target.checked)}
                className="rounded"
              />
              {t("includeUnits")}
            </Label>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTags}
                onChange={(e) => setIncludeTags(e.target.checked)}
                className="rounded"
              />
              {t("includeTags")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() =>
              duplicateMutation.mutate({
                id: propertyId,
                includeUnits,
                includeTags,
              })
            }
            disabled={duplicateMutation.isPending}
          >
            {duplicateMutation.isPending ? t("duplicating") : t("duplicate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
