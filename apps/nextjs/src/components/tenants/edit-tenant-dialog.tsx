"use client";

import { useEffect, useState } from "react";
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

interface EditTenantDialogProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTenantDialog({
  tenantId,
  open,
  onOpenChange,
}: EditTenantDialogProps) {
  const t = useTranslations("tenants");
  const utils = trpc.useUtils();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const { data: tenant } = trpc.tenants.getById.useQuery(
    { id: tenantId },
    { enabled: open },
  );

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
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "emails",
  });

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      form.reset({
        rentalUnitId: tenant.rentalUnitId ?? undefined,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        phone: tenant.phone ?? undefined,
        gender: tenant.gender ?? undefined,
        iban: tenant.iban ?? undefined,
        previousAddress: tenant.previousAddress ?? undefined,
        depositPaid: tenant.depositPaid,
        rentStart: tenant.rentStart,
        rentEnd: tenant.rentEnd ?? undefined,
        coldRent: tenant.coldRent / 100,
        warmRent: tenant.warmRent / 100,
        noticePeriodMonths: tenant.noticePeriodMonths ?? undefined,
        rentType: tenant.rentType ?? undefined,
      });
      replace(
        tenant.emails.map((e) => ({
          email: e.email,
          isPrimary: e.isPrimary,
        })),
      );
      if (tenant.unitInfo) {
        setSelectedPropertyId(tenant.unitInfo.propertyId);
      }
    }
  }, [tenant, form, replace]);

  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      utils.tenants.getById.invalidate({ id: tenantId });
      onOpenChange(false);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({
      id: tenantId,
      data: {
        ...data,
        coldRent: Math.round(data.coldRent * 100),
        warmRent: Math.round(data.warmRent * 100),
        rentEnd: data.rentEnd || undefined,
        phone: data.phone || undefined,
        iban: data.iban || undefined,
        previousAddress: data.previousAddress || undefined,
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editTenant")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-medium">{t("personalInfo")}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("firstName")}</Label>
              <Input {...form.register("firstName")} />
            </div>
            <div className="space-y-1">
              <Label>{t("lastName")}</Label>
              <Input {...form.register("lastName")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("gender")}</Label>
            <Select
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

          <h3 className="font-medium pt-2">{t("contractDetails")}</h3>

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
              <SelectContent>
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
                  v !== null && form.setValue("rentalUnitId", v || undefined)
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
