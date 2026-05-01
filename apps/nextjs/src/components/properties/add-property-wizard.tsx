"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@/lib/zod-resolver";
import {
  createPropertyInput,
  type CreatePropertyInput,
} from "@repo/shared/validation";
import {
  PROPERTY_TYPES,
  PROPERTY_STATUS,
  MULTI_UNIT_TYPES,
} from "@repo/shared/types";
import type { PropertyType } from "@repo/shared/types";
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

interface AddPropertyWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ["basicInfo", "address", "financial", "details"] as const;

export function AddPropertyWizard({
  open,
  onOpenChange,
}: AddPropertyWizardProps) {
  const t = useTranslations("properties");
  const [step, setStep] = useState(0);
  const utils = trpc.useUtils();

  const createMutation = trpc.properties.create.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      utils.properties.getAggregatedKpis.invalidate();
      onOpenChange(false);
      reset();
      setStep(0);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertyInput),
    defaultValues: {
      type: "apartment",
      status: "rented",
      country: "DE",
      unitCount: 1,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() cannot be memoized; accepted trade-off (see React Compiler docs)
  const propertyType = watch("type") as PropertyType;
  const showUnitCount = MULTI_UNIT_TYPES.has(propertyType);

  const onSubmit = (data: CreatePropertyInput) => {
    createMutation.mutate(data);
  };

  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("addProperty")} - {t(`wizard.${STEPS[step]}`)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("type")}</Label>
                <Select
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

              {showUnitCount && (
                <div className="space-y-2">
                  <Label>{t("unitCount")}</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register("unitCount", { valueAsNumber: true })}
                  />
                  {errors.unitCount && (
                    <p className="text-xs text-destructive">
                      {errors.unitCount.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Address */}
          {step === 1 && (
            <div className="space-y-4">
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
              <div className="space-y-2">
                <Label>{t("country")}</Label>
                <Input {...register("country")} />
              </div>
            </div>
          )}

          {/* Step 3: Financial */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("purchasePrice")}</Label>
                <Input
                  type="number"
                  min={1}
                  {...register("purchasePrice", { valueAsNumber: true })}
                />
                {errors.purchasePrice && (
                  <p className="text-xs text-destructive">
                    {errors.purchasePrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("purchaseDate")}</Label>
                <Input type="date" {...register("purchaseDate")} />
                {errors.purchaseDate && (
                  <p className="text-xs text-destructive">
                    {errors.purchaseDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("marketValue")}</Label>
                <Input
                  type="number"
                  min={1}
                  {...register("marketValue", { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("livingArea")}</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register("livingAreaSqm", { valueAsNumber: true })}
                  />
                  {errors.livingAreaSqm && (
                    <p className="text-xs text-destructive">
                      {errors.livingAreaSqm.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("landArea")}</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register("landAreaSqm", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("constructionYear")}</Label>
                  <Input
                    type="number"
                    min={1800}
                    max={2100}
                    {...register("constructionYear", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("roomCount")}</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register("roomCount", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("notes")}</Label>
                <Textarea {...register("notes")} />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            {canGoBack && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
              >
                {t("wizard.back")}
              </Button>
            )}
            {canGoNext && (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                {t("wizard.next")}
              </Button>
            )}
            {isLastStep && (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? t("wizard.creating")
                  : t("wizard.create")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
