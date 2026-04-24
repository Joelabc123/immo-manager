"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@/lib/zod-resolver";
import { createTenantInput } from "@repo/shared/validation";
import { GENDERS, RENT_TYPES } from "@repo/shared/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = {
  rentalUnitId?: string;
  firstName: string;
  lastName: string;
  emails: Array<{ email: string; isPrimary: boolean }>;
  phone?: string;
  gender?: string;
  iban?: string;
  previousAddress?: string;
  depositPaid: boolean;
  rentStart: string;
  rentEnd?: string;
  coldRent: number;
  warmRent: number;
  noticePeriodMonths?: number;
  rentType?: string;
};

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ["personalInfo", "contractDetails"] as const;

export function AddTenantDialog({ open, onOpenChange }: AddTenantDialogProps) {
  const t = useTranslations("tenants");
  const utils = trpc.useUtils();
  const [step, setStep] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const { data: propertiesData } = trpc.properties.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );

  const { data: unitsData } = trpc.rentalUnits.list.useQuery(
    { propertyId: selectedPropertyId },
    { enabled: open && !!selectedPropertyId },
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(createTenantInput),
    defaultValues: {
      firstName: "",
      lastName: "",
      emails: [{ email: "", isPrimary: true }],
      depositPaid: false,
      rentStart: new Date().toISOString().split("T")[0],
      coldRent: 0,
      warmRent: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emails",
  });

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      form.reset();
      setStep(0);
      setSelectedPropertyId("");
      onOpenChange(false);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate({
      ...data,
      coldRent: Math.round(data.coldRent * 100),
      warmRent: Math.round(data.warmRent * 100),
      rentEnd: data.rentEnd || undefined,
      phone: data.phone || undefined,
      iban: data.iban || undefined,
      previousAddress: data.previousAddress || undefined,
    });
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setStep(0);
      setSelectedPropertyId("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addTenant")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step indicators */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">{t("personalInfo")}</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("firstName")}</Label>
                  <Input {...form.register("firstName")} />
                  {form.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>{t("lastName")}</Label>
                  <Input {...form.register("lastName")} />
                  {form.formState.errors.lastName && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("gender")}</Label>
                <Select
                  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() cannot be memoized; accepted trade-off (see React Compiler docs)
                  value={form.watch("gender") ?? ""}
                  onValueChange={(v) =>
                    v !== null && form.setValue("gender", v || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(GENDERS).map((g) => (
                      <SelectItem key={g} value={g}>
                        {t(`genders.${g}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("phone")}</Label>
                <Input {...form.register("phone")} />
              </div>

              <div className="space-y-2">
                <Label>{t("emails")}</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <Input
                      {...form.register(`emails.${index}.email`)}
                      type="email"
                      placeholder={t("email")}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        {...form.register(`emails.${index}.isPrimary`)}
                      />
                      {t("primaryEmail")}
                    </label>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ email: "", isPrimary: false })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addEmail")}
                </Button>
              </div>

              <div className="space-y-1">
                <Label>{t("iban")}</Label>
                <Input {...form.register("iban")} />
              </div>

              <div className="space-y-1">
                <Label>{t("previousAddress")}</Label>
                <Input {...form.register("previousAddress")} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">{t("contractDetails")}</h3>

              <div className="space-y-1">
                <Label>{t("selectProperty")}</Label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={(v) => {
                    if (v !== null) {
                      setSelectedPropertyId(v);
                      form.setValue("rentalUnitId", undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProperty")}>
                      {(value: string) => {
                        const p = propertiesData?.items.find(
                          (item) => item.id === value,
                        );
                        return p
                          ? [p.street, p.city].filter(Boolean).join(", ") ||
                              p.id.slice(0, 8)
                          : value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-auto min-w-[var(--anchor-width)]">
                    {propertiesData?.items.map((p) => {
                      const displayName =
                        [p.street, p.city].filter(Boolean).join(", ") ||
                        p.id.slice(0, 8);
                      return (
                        <SelectItem key={p.id} value={p.id} label={displayName}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedPropertyId && unitsData && (
                <div className="space-y-1">
                  <Label>{t("selectUnit")}</Label>
                  <Select
                    value={form.watch("rentalUnitId") ?? ""}
                    onValueChange={(v) =>
                      v !== null &&
                      form.setValue("rentalUnitId", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectUnit")}>
                        {(value: string) => {
                          const u = unitsData.find((item) => item.id === value);
                          return u
                            ? `${u.name}${u.floor ? ` (${u.floor})` : ""}`
                            : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {unitsData.map((u) => {
                        const unitLabel = `${u.name}${u.floor ? ` (${u.floor})` : ""}`;
                        return (
                          <SelectItem key={u.id} value={u.id} label={unitLabel}>
                            {unitLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("coldRent")} (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("coldRent", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("warmRent")} (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("warmRent", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("rentStart")}</Label>
                  <Input type="date" {...form.register("rentStart")} />
                </div>
                <div className="space-y-1">
                  <Label>{t("rentEnd")}</Label>
                  <Input type="date" {...form.register("rentEnd")} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("noticePeriod")}</Label>
                <Input
                  type="number"
                  {...form.register("noticePeriodMonths", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label>{t("rentType")}</Label>
                <Select
                  value={form.watch("rentType") ?? ""}
                  onValueChange={(v) =>
                    v !== null && form.setValue("rentType", v || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(RENT_TYPES).map((rt) => (
                      <SelectItem key={rt} value={rt}>
                        {t(`rentTypes.${rt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="depositPaid"
                  {...form.register("depositPaid")}
                />
                <Label htmlFor="depositPaid">{t("depositPaid")}</Label>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                {t("cancel")}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep(step + 1)}>
                {t("contractDetails")}
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("creating") : t("save")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
