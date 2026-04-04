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

interface DeleteTenantDialogProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTenantDialog({
  tenantId,
  open,
  onOpenChange,
}: DeleteTenantDialogProps) {
  const t = useTranslations("tenants");
  const utils = trpc.useUtils();

  const { data: deps } = trpc.tenants.getDependencies.useQuery(
    { id: tenantId },
    { enabled: open },
  );

  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("deleteTenant")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("deleteWarning")}</p>

          {deps && (deps.rentPayments > 0 || deps.dunningRecords > 0) && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm font-medium">{t("willBeDeleted")}:</p>
              <ul className="mt-1 text-sm text-muted-foreground list-disc pl-4">
                {deps.rentPayments > 0 && (
                  <li>
                    {deps.rentPayments}{" "}
                    {t("../rentPayments.title", {
                      defaultValue: "Rent Payments",
                    })}
                  </li>
                )}
                {deps.dunningRecords > 0 && (
                  <li>
                    {deps.dunningRecords}{" "}
                    {t("../dunning.title", { defaultValue: "Dunning Records" })}
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
            onClick={() => deleteMutation.mutate({ id: tenantId })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t("deleting") : t("deleteTenant")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
