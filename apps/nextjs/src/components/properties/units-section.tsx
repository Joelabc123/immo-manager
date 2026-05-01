"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@/lib/zod-resolver";
import { createRentalUnitInput } from "@repo/shared/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UnitsSectionProps {
  propertyId: string;
}

export function UnitsSection({ propertyId }: UnitsSectionProps) {
  const t = useTranslations("rentalUnits");
  const router = useRouter();
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [editUnitId, setEditUnitId] = useState<string | null>(null);

  const { data: units } = trpc.rentalUnits.list.useQuery({ propertyId });

  const deleteMutation = trpc.rentalUnits.delete.useMutation({
    onSuccess: () => utils.rentalUnits.list.invalidate(),
  });

  const form = useForm({
    resolver: zodResolver(createRentalUnitInput),
    defaultValues: {
      propertyId,
      name: "",
      floor: undefined as string | undefined,
      areaSqm: undefined as number | undefined,
    },
  });

  const createMutation = trpc.rentalUnits.create.useMutation({
    onSuccess: () => {
      utils.rentalUnits.list.invalidate();
      utils.properties.getById.invalidate({ id: propertyId });
      setAddOpen(false);
      form.reset({ propertyId, name: "" });
    },
  });

  const updateMutation = trpc.rentalUnits.update.useMutation({
    onSuccess: () => {
      utils.rentalUnits.list.invalidate();
      setEditUnitId(null);
      form.reset({ propertyId, name: "" });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    const payload = {
      ...data,
      areaSqm: Number.isNaN(data.areaSqm) ? undefined : data.areaSqm,
      floor: data.floor || undefined,
    };

    if (editUnitId) {
      updateMutation.mutate({
        id: editUnitId,
        data: {
          name: payload.name,
          floor: payload.floor,
          areaSqm: payload.areaSqm,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  });

  const openAddDialog = () => {
    form.reset({ propertyId, name: "", floor: undefined, areaSqm: undefined });
    setEditUnitId(null);
    setAddOpen(true);
  };

  const openEditDialog = (unit: NonNullable<typeof units>[number]) => {
    form.reset({
      propertyId,
      name: unit.name,
      floor: unit.floor ?? undefined,
      areaSqm: unit.areaSqm ?? undefined,
    });
    setEditUnitId(unit.id);
    setAddOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("addUnit")}
        </Button>
      </CardHeader>
      <CardContent>
        {!units || units.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noUnits")}</p>
        ) : (
          <div className="space-y-2">
            {units.map((unit) => (
              <div
                key={unit.id}
                role={unit.tenants?.[0]?.tenantId ? "button" : undefined}
                tabIndex={unit.tenants?.[0]?.tenantId ? 0 : undefined}
                onClick={() => {
                  const tenantId = unit.tenants?.[0]?.tenantId;
                  if (tenantId) router.push(`/tenants/${tenantId}`);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  const tenantId = unit.tenants?.[0]?.tenantId;
                  if (tenantId) router.push(`/tenants/${tenantId}`);
                }}
                className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{unit.name}</p>
                    {unit.floor && (
                      <span className="text-sm text-muted-foreground">
                        {t("floor")} {unit.floor}
                      </span>
                    )}
                    {unit.areaSqm && (
                      <span className="text-sm text-muted-foreground">
                        {unit.areaSqm} m²
                      </span>
                    )}
                  </div>
                  {unit.tenants && unit.tenants.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {unit.tenants.map((tenant) => (
                        <Badge
                          key={tenant.tenantId}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tenant.firstName} {tenant.lastName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditDialog(unit);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteMutation.mutate({ id: unit.id });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Unit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editUnitId ? t("editUnit") : t("addUnit")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>{t("name")}</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  {t("floor")} ({t("optional")})
                </Label>
                <Input {...form.register("floor")} />
              </div>
              <div className="space-y-1">
                <Label>
                  {t("area")} ({t("optional")})
                </Label>
                <Input
                  type="number"
                  step="1"
                  {...form.register("areaSqm", { valueAsNumber: true })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editUnitId ? t("save") : t("addUnit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
