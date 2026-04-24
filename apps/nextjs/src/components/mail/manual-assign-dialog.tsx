"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ManualAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailId: string;
}

export function ManualAssignDialog({
  open,
  onOpenChange,
  emailId,
}: ManualAssignDialogProps) {
  const t = useTranslations("email");
  const [propertyId, setPropertyId] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: propertiesData } = trpc.properties.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );

  const { data: tenantsData } = trpc.tenants.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );

  const assignMutation = trpc.email.assign.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      setPropertyId("");
      setTenantId("");
      void utils.email.list.invalidate();
    },
  });

  const handleAssign = () => {
    if (!propertyId && !tenantId) return;
    assignMutation.mutate({
      emailId,
      tenantId: tenantId || null,
      propertyId: propertyId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assign.title")}</DialogTitle>
          <DialogDescription>{t("assign.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>{t("assign.property")}</Label>
            <Select
              value={propertyId}
              onValueChange={(val) => setPropertyId(val ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    const p = propertiesData?.items?.find(
                      (item) => item.id === value,
                    );
                    return p ? `${p.street}, ${p.city}` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {propertiesData?.items?.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    label={`${p.street}, ${p.city}`}
                  >
                    {p.street}, {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("assign.tenant")}</Label>
            <Select
              value={tenantId}
              onValueChange={(val) => setTenantId(val ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    const tenant = tenantsData?.items?.find(
                      (item) => item.id === value,
                    );
                    return tenant
                      ? `${tenant.firstName} ${tenant.lastName}`
                      : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenantsData?.items?.map((tenant) => (
                  <SelectItem
                    key={tenant.id}
                    value={tenant.id}
                    label={`${tenant.firstName} ${tenant.lastName}`}
                  >
                    {tenant.firstName} {tenant.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={handleAssign}
            disabled={(!propertyId && !tenantId) || assignMutation.isPending}
          >
            {t("assign.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
