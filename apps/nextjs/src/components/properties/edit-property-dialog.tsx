"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@/lib/zod-resolver";
import {
  updatePropertyInput,
  type UpdatePropertyInput,
} from "@repo/shared/validation";
import { PROPERTY_TYPES, PROPERTY_STATUS } from "@repo/shared/types";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditPropertyDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPropertyDialog({
  propertyId,
  open,
  onOpenChange,
}: EditPropertyDialogProps) {
  const t = useTranslations("properties");
  const utils = trpc.useUtils();

  const { data: property } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: open },
  );

  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      utils.properties.getById.invalidate({ id: propertyId });
      utils.properties.getAggregatedKpis.invalidate();
      onOpenChange(false);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: {},
  } = useForm<UpdatePropertyInput>({
    resolver: zodResolver(updatePropertyInput),
    values: property
      ? {
          type: property.type,
          status: property.status,
          street: property.street ?? undefined,
          city: property.city ?? undefined,
          zipCode: property.zipCode ?? undefined,
          country: property.country,
          livingAreaSqm: property.livingAreaSqm,
          landAreaSqm: property.landAreaSqm ?? undefined,
          constructionYear: property.constructionYear ?? undefined,
          roomCount: property.roomCount ?? undefined,
          purchasePrice: property.purchasePrice,
          purchaseDate: property.purchaseDate,
          marketValue: property.marketValue ?? undefined,
          unitCount: property.unitCount,
          notes: property.notes ?? undefined,
        }
      : undefined,
  });

  const onSubmit = (data: UpdatePropertyInput) => {
    updateMutation.mutate({ id: propertyId, data });
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editProperty")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select
                // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() cannot be memoized; accepted trade-off (see React Compiler docs)
                value={watch("type")}
                onValueChange={(val) => val && setValue("type", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value ? t(`types.${value}`) : t("type")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PROPERTY_TYPES).map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      label={t(`types.${type}`)}
                    >
                      {t(`types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("statusLabel")}</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) => val && setValue("status", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value ? t(`status.${value}`) : t("statusLabel")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PROPERTY_STATUS).map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                      label={t(`status.${status}`)}
                    >
                      {t(`status.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("street")}</Label>
            <Input {...register("street")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("zipCode")}</Label>
              <Input {...register("zipCode")} />
            </div>
            <div className="space-y-2">
              <Label>{t("city")}</Label>
              <Input {...register("city")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("purchasePrice")}</Label>
              <Input
                type="number"
                {...register("purchasePrice", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchaseDate")}</Label>
              <Input type="date" {...register("purchaseDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("livingArea")}</Label>
              <Input
                type="number"
                {...register("livingAreaSqm", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("marketValue")}</Label>
              <Input
                type="number"
                {...register("marketValue", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("constructionYear")}</Label>
              <Input
                type="number"
                {...register("constructionYear", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("roomCount")}</Label>
              <Input
                type="number"
                {...register("roomCount", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea {...register("notes")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
