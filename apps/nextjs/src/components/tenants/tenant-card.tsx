"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, MapPin, Calendar, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";

interface TenantCardProps {
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    coldRent: number;
    warmRent: number;
    rentStart: string;
    rentEnd: string | null;
    rentalUnitId: string | null;
    unitInfo: {
      unitName: string;
      propertyStreet: string | null;
      propertyCity: string | null;
    } | null;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TenantCard({ tenant, onEdit, onDelete }: TenantCardProps) {
  const { formatCurrency } = useCurrency();
  const t = useTranslations("tenants");
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const isFormer = tenant.rentEnd && tenant.rentEnd < today;
  const statusKey = isFormer ? "former" : "active";
  const statusColor = isFormer
    ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";

  const address = tenant.unitInfo
    ? [tenant.unitInfo.propertyStreet, tenant.unitInfo.propertyCity]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(`/tenants/${tenant.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">
                {tenant.firstName} {tenant.lastName}
              </h3>
              {address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {address}
                </p>
              )}
              {tenant.unitInfo && (
                <p className="text-xs text-muted-foreground">
                  {tenant.unitInfo.unitName}
                </p>
              )}
            </div>
          </div>
          <Badge className={statusColor}>{t(statusKey)}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Banknote className="h-3.5 w-3.5" />
            <span>
              {formatCurrency(tenant.coldRent)} /{" "}
              {formatCurrency(tenant.warmRent)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDate(tenant.rentStart)}
              {tenant.rentEnd ? ` - ${formatDate(tenant.rentEnd)}` : ""}
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2 text-xs">
          <button
            className="text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tenant.id);
            }}
          >
            {t("editTenant")}
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            className="text-destructive hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tenant.id);
            }}
          >
            {t("deleteTenant")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
