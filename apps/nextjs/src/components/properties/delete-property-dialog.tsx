"use client";

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

interface DeletePropertyDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletePropertyDialog({
  propertyId,
  open,
  onOpenChange,
}: DeletePropertyDialogProps) {
  const t = useTranslations("properties");
  const utils = trpc.useUtils();

  const { data: deps } = trpc.properties.getDependencies.useQuery(
    { id: propertyId },
    { enabled: open },
  );

  const deleteMutation = trpc.properties.delete.useMutation({
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
          <DialogTitle>{t("deleteProperty")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("deleteWarning")}</p>

          {deps && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">
                {t("willBeDeleted")}:
              </p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {deps.rentalUnits > 0 && (
                  <li>
                    {deps.rentalUnits} {t("rentalUnits")}
                  </li>
                )}
                {deps.tags > 0 && (
                  <li>
                    {deps.tags} {t("tagAssignments")}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate({ id: propertyId })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t("deleting") : t("deleteAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
