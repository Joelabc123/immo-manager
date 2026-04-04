"use client";

import { useState, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search, LayoutGrid, Map as MapIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyKpiBar } from "@/components/properties/property-kpi-bar";
import { AddPropertyWizard } from "@/components/properties/add-property-wizard";
import { EditPropertyDialog } from "@/components/properties/edit-property-dialog";
import { DeletePropertyDialog } from "@/components/properties/delete-property-dialog";
import { DuplicatePropertyDialog } from "@/components/properties/duplicate-property-dialog";
import { PROPERTY_STATUS } from "@repo/shared/types";

const PropertyMap = lazy(() =>
  import("@/components/properties/property-map").then((m) => ({
    default: m.PropertyMap,
  })),
);

type SortBy =
  | "createdAt"
  | "purchasePrice"
  | "marketValue"
  | "city"
  | "livingAreaSqm";

export default function PropertiesPage() {
  const router = useRouter();
  const t = useTranslations("properties");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [showMap, setShowMap] = useState(false);

  // Dialog states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const { data: propertiesData, isLoading } = trpc.properties.list.useQuery({
    search: search || undefined,
    status: statusFilter ?? undefined,
    sortBy,
    sortOrder,
    page,
    pageSize: 20,
  });

  const { data: kpis, isLoading: kpisLoading } =
    trpc.properties.getAggregatedKpis.useQuery();

  const handlePropertyClick = (id: string) => {
    router.push(`/properties/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addProperty")}
        </Button>
      </div>

      {/* KPI Bar */}
      <PropertyKpiBar
        totalProperties={kpis?.totalProperties ?? 0}
        totalUnits={kpis?.totalUnits ?? 0}
        totalMarketValue={kpis?.totalMarketValue ?? 0}
        totalPurchasePrice={kpis?.totalPurchasePrice ?? 0}
        isLoading={kpisLoading}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter ?? "all"}
          onValueChange={(val) => {
            setStatusFilter(val === "all" ? null : val);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {Object.values(PROPERTY_STATUS).map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(val) => val && setSortBy(val as SortBy)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t("sort.newest")}</SelectItem>
            <SelectItem value="purchasePrice">
              {t("sort.purchasePrice")}
            </SelectItem>
            <SelectItem value="marketValue">{t("sort.marketValue")}</SelectItem>
            <SelectItem value="city">{t("sort.city")}</SelectItem>
            <SelectItem value="livingAreaSqm">{t("sort.area")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showMap ? "default" : "outline"}
          size="icon"
          onClick={() => setShowMap(!showMap)}
        >
          {showMap ? (
            <LayoutGrid className="h-4 w-4" />
          ) : (
            <MapIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Map View */}
      {showMap && propertiesData && (
        <Suspense
          fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}
        >
          <div className="rounded-lg overflow-hidden border">
            <PropertyMap
              properties={propertiesData.items}
              onMarkerClick={handlePropertyClick}
              className="h-[300px] w-full"
            />
          </div>
        </Suspense>
      )}

      {/* Property Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : propertiesData && propertiesData.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {propertiesData.items.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={handlePropertyClick}
                onEdit={setEditId}
                onDelete={setDeleteId}
                onDuplicate={setDuplicateId}
              />
            ))}
          </div>

          {/* Pagination */}
          {propertiesData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {propertiesData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= propertiesData.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{t("noProperties")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("noPropertiesDescription")}
          </p>
          <Button className="mt-4" onClick={() => setWizardOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addProperty")}
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AddPropertyWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {editId && (
        <EditPropertyDialog
          propertyId={editId}
          open={!!editId}
          onOpenChange={(open) => !open && setEditId(null)}
        />
      )}

      {deleteId && (
        <DeletePropertyDialog
          propertyId={deleteId}
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        />
      )}

      {duplicateId && (
        <DuplicatePropertyDialog
          propertyId={duplicateId}
          open={!!duplicateId}
          onOpenChange={(open) => !open && setDuplicateId(null)}
        />
      )}
    </div>
  );
}
