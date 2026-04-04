"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RentBenchmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  region: string;
  rentPerSqm: string;
  validFrom: string;
  source: string;
}

export function RentBenchmarkDialog({
  open,
  onOpenChange,
}: RentBenchmarkDialogProps) {
  const t = useTranslations("settings.marketData");
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    defaultValues: {
      region: "",
      rentPerSqm: "",
      validFrom: new Date().toISOString().split("T")[0],
      source: "",
    },
  });

  const createMutation = trpc.marketData.createRentBenchmark.useMutation({
    onSuccess: () => {
      void utils.marketData.listRentBenchmarks.invalidate();
      form.reset();
      onOpenChange(false);
    },
  });

  const onSubmit = (values: FormValues) => {
    const rentPerSqmCents = Math.round(parseFloat(values.rentPerSqm) * 100);
    createMutation.mutate({
      region: values.region,
      rentPerSqmCents,
      validFrom: values.validFrom,
      source: values.source || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addBenchmark")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("region")}</Label>
            <Input
              placeholder={t("regionPlaceholder")}
              {...form.register("region", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("rentPerSqm")} (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="8.50"
              {...form.register("rentPerSqm", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("validFrom")}</Label>
            <Input
              type="date"
              {...form.register("validFrom", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("source")}</Label>
            <Input
              placeholder={t("sourcePlaceholder")}
              {...form.register("source")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
