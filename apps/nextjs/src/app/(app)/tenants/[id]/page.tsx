"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EditTenantDialog } from "@/components/tenants/edit-tenant-dialog";
import { DeleteTenantDialog } from "@/components/tenants/delete-tenant-dialog";
import { RentPaymentTable } from "@/components/tenants/rent-payment-table";
import { RentAdjustmentDialog } from "@/components/tenants/rent-adjustment-dialog";
import { DunningSection } from "@/components/tenants/dunning-section";
import { EntityAuditSection } from "@/components/audit/entity-audit-section";

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("tenants");
  const { formatCurrency } = useCurrency();
  const tPayments = useTranslations("rentPayments");
  const tAdjustments = useTranslations("rentAdjustments");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  const { data: tenant, isLoading } = trpc.tenants.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">{t("notFound")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/tenants")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const isActive = !tenant.rentEnd || new Date(tenant.rentEnd) >= new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/tenants")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {tenant.firstName} {tenant.lastName}
              </h1>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? t("statusActive") : t("statusFormer")}
              </Badge>
            </div>
            {tenant.unitInfo && (
              <p className="text-sm text-muted-foreground">
                {tenant.unitInfo.unitName} - {tenant.unitInfo.propertyStreet},{" "}
                {tenant.unitInfo.propertyCity}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdjustmentOpen(true)}
          >
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            {tAdjustments("addAdjustment")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            {t("edit")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("deleteAction")}
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("personalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={User}
              label={t("gender")}
              value={t(`genders.${tenant.gender}`)}
            />
            {tenant.phone && (
              <DetailRow icon={Phone} label={t("phone")} value={tenant.phone} />
            )}
            {tenant.emails && tenant.emails.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Mail className="h-3.5 w-3.5" />
                  {t("email")}
                </div>
                <div className="space-y-0.5">
                  {tenant.emails.map((e) => (
                    <p key={e.id} className="text-sm font-medium">
                      {e.email}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {tenant.iban && (
              <DetailRow icon={DollarSign} label="IBAN" value={tenant.iban} />
            )}
            {tenant.previousAddress && (
              <DetailRow
                icon={User}
                label={t("previousAddress")}
                value={tenant.previousAddress}
              />
            )}
          </CardContent>
        </Card>

        {/* Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("contractInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={Calendar}
              label={t("rentStart")}
              value={formatDate(tenant.rentStart)}
            />
            {tenant.rentEnd && (
              <DetailRow
                icon={Calendar}
                label={t("rentEnd")}
                value={formatDate(tenant.rentEnd)}
              />
            )}
            <Separator />
            <DetailRow
              icon={DollarSign}
              label={t("coldRent")}
              value={formatCurrency(tenant.coldRent)}
            />
            <DetailRow
              icon={DollarSign}
              label={t("warmRent")}
              value={formatCurrency(tenant.warmRent)}
            />
            <Separator />
            <DetailRow
              icon={Calendar}
              label={t("rentType")}
              value={t(`rentTypes.${tenant.rentType}`)}
            />
            {tenant.noticePeriodMonths && (
              <DetailRow
                icon={Calendar}
                label={t("noticePeriod")}
                value={`${tenant.noticePeriodMonths} ${t("months")}`}
              />
            )}
            {tenant.depositPaid !== undefined && (
              <DetailRow
                icon={DollarSign}
                label={t("depositPaid")}
                value={tenant.depositPaid ? t("yes") : t("no")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rent Adjustments History */}
      {tenant.rentAdjustments && tenant.rentAdjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{tAdjustments("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenant.rentAdjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="text-muted-foreground">
                      {formatDate(adj.effectiveDate)}
                    </span>
                    {adj.reason && (
                      <span className="ml-2 text-muted-foreground">
                        — {adj.reason}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatCurrency(adj.oldColdRent)} →{" "}
                    {formatCurrency(adj.newColdRent)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>{tPayments("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RentPaymentTable tenantId={id} />
        </CardContent>
      </Card>

      {/* Dunning */}
      <DunningSection tenantId={id} />

      {/* Audit Log */}
      <EntityAuditSection entityType="tenant" entityId={id} />

      {/* Dialogs */}
      <EditTenantDialog
        tenantId={id}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteTenantDialog
        tenantId={id}
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) router.push("/tenants");
        }}
      />
      <RentAdjustmentDialog
        tenantId={id}
        currentColdRent={tenant.coldRent}
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
