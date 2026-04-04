"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Users } from "lucide-react";
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
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

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

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
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
                className="flex items-center justify-between border rounded-md p-3"
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate({ id: unit.id })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Unit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("addUnit")}</DialogTitle>
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
                  step="0.1"
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
              <Button type="submit" disabled={createMutation.isPending}>
                {t("addUnit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
