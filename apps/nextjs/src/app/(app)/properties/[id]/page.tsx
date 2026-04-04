"use client";

import { use, useState, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  Share2,
  Building2,
  MapPin,
  Calendar,
  Ruler,
  Home,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EditPropertyDialog } from "@/components/properties/edit-property-dialog";
import { DeletePropertyDialog } from "@/components/properties/delete-property-dialog";
import { DuplicatePropertyDialog } from "@/components/properties/duplicate-property-dialog";
import { ShareLinkDialog } from "@/components/properties/share-link-dialog";
import { ThumbnailUpload } from "@/components/properties/thumbnail-upload";
import { LoansSection } from "@/components/properties/loans-section";
import { ExpensesSection } from "@/components/properties/expenses-section";
import { UnitsSection } from "@/components/properties/units-section";
import { CashflowSection } from "@/components/properties/cashflow-section";
import { DocumentsSection } from "@/components/documents/documents-section";
import { EntityAuditSection } from "@/components/audit/entity-audit-section";

const PropertyMap = lazy(() =>
  import("@/components/properties/property-map").then((m) => ({
    default: m.PropertyMap,
  })),
);

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("properties");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: property, isLoading } = trpc.properties.getById.useQuery({
    id,
  });

  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      utils.properties.getById.invalidate({ id });
    },
  });

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

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">{t("notFound")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/properties")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const address = [property.street, property.zipCode, property.city]
    .filter(Boolean)
    .join(", ");

  const hasCoordinates = property.latitude && property.longitude;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/properties")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{address || t("noAddress")}</h1>
            <p className="text-sm text-muted-foreground">
              {t(`types.${property.type}`)}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            {t("share")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDuplicateOpen(true)}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {t("duplicate")}
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

      {/* Hero Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Thumbnail */}
        <Card>
          <CardContent>
            <ThumbnailUpload
              propertyId={id}
              currentPath={property.thumbnailPath}
              onUploadComplete={() => {
                updateMutation.mutate({
                  id,
                  data: { ...({} as Record<string, never>) },
                });
                // Update thumbnail path directly
                utils.properties.getById.invalidate({ id });
              }}
            />
          </CardContent>
        </Card>

        {/* Key Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("status")}
              </span>
              <Badge variant="secondary">
                {t(`status.${property.status}`)}
              </Badge>
            </div>
            <Separator />
            <DetailRow
              icon={Ruler}
              label={t("livingArea")}
              value={`${property.livingAreaSqm} m²`}
            />
            {property.landAreaSqm && (
              <DetailRow
                icon={MapPin}
                label={t("landArea")}
                value={`${property.landAreaSqm} m²`}
              />
            )}
            {property.constructionYear && (
              <DetailRow
                icon={Calendar}
                label={t("constructionYear")}
                value={property.constructionYear.toString()}
              />
            )}
            {property.roomCount && (
              <DetailRow
                icon={Home}
                label={t("roomCount")}
                value={property.roomCount.toString()}
              />
            )}
            <Separator />
            <DetailRow
              icon={DollarSign}
              label={t("purchasePrice")}
              value={formatCurrency(property.purchasePrice)}
            />
            <DetailRow
              icon={Calendar}
              label={t("purchaseDate")}
              value={formatDate(property.purchaseDate)}
            />
            {property.marketValue && (
              <DetailRow
                icon={DollarSign}
                label={t("marketValue")}
                value={formatCurrency(property.marketValue)}
              />
            )}
            <Separator />
            <DetailRow
              icon={Building2}
              label={t("unitCount")}
              value={property.unitCount.toString()}
            />
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      {hasCoordinates && (
        <Card>
          <CardHeader>
            <CardTitle>{t("location")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}
            >
              <PropertyMap
                properties={[property]}
                center={[
                  parseFloat(property.latitude!),
                  parseFloat(property.longitude!),
                ]}
                zoom={15}
                className="h-[300px] w-full rounded-lg"
              />
            </Suspense>
          </CardContent>
        </Card>
      )}

      {/* Rental Units (enhanced with tenant info) */}
      <UnitsSection propertyId={id} />

      {/* Loans */}
      <LoansSection propertyId={id} />

      {/* Expenses */}
      <ExpensesSection propertyId={id} />

      {/* Cashflow Overview */}
      <CashflowSection propertyId={id} />

      {/* Documents */}
      <DocumentsSection propertyId={id} />

      {/* Audit Log */}
      <EntityAuditSection entityType="property" entityId={id} />

      {/* Tags */}
      {property.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tags")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {property.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {property.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <EditPropertyDialog
        propertyId={id}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeletePropertyDialog
        propertyId={id}
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) router.push("/properties");
        }}
      />
      <DuplicatePropertyDialog
        propertyId={id}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />
      <ShareLinkDialog
        propertyId={id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-14 left-0 right-0 z-40 flex items-center justify-around border-t bg-card px-2 py-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDuplicateOpen(true)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
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
