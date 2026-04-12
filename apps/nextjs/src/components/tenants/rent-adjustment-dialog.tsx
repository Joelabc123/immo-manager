"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RentAdjustmentDialogProps {
  tenantId: string;
  currentColdRent: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentAdjustmentDialog({
  tenantId,
  currentColdRent,
  open,
  onOpenChange,
}: RentAdjustmentDialogProps) {
  const t = useTranslations("rentAdjustments");
  const tCommon = useTranslations("common");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();
  const [newColdRent, setNewColdRent] = useState(
    (currentColdRent / 100).toFixed(2),
  );
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reason, setReason] = useState("");

  const { data: adjustments } = trpc.rentAdjustments.list.useQuery(
    { tenantId },
    { enabled: open },
  );

  const createMutation = trpc.rentAdjustments.create.useMutation({
    onSuccess: () => {
      utils.rentAdjustments.list.invalidate();
      utils.tenants.getById.invalidate({ id: tenantId });
      utils.tenants.list.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addAdjustment")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("oldColdRent")}</Label>
            <Input value={formatCurrency(currentColdRent)} disabled />
          </div>

          <div className="space-y-1">
            <Label>{t("newColdRent")} (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              value={newColdRent}
              onChange={(e) => setNewColdRent(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>{t("effectiveDate")}</Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>{t("reason")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* History */}
          {adjustments && adjustments.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">{t("title")}</h4>
              <div className="space-y-1">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="text-sm flex justify-between text-muted-foreground"
                  >
                    <span>{formatDate(adj.effectiveDate)}</span>
                    <span>
                      {formatCurrency(adj.oldColdRent)} →{" "}
                      {formatCurrency(adj.newColdRent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={() =>
              createMutation.mutate({
                tenantId,
                newColdRent: Math.round(parseFloat(newColdRent) * 100),
                effectiveDate,
                reason: reason || undefined,
              })
            }
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? t("creating") : t("addAdjustment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
