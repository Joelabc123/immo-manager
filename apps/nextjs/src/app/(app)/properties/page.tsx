"use client";

import { useState, Suspense, lazy, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Map,
  PanelRightClose,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropertyKpiBar } from "@/components/properties/property-kpi-bar";
import { AddPropertyWizard } from "@/components/properties/add-property-wizard";
import { EditPropertyDialog } from "@/components/properties/edit-property-dialog";
import { DeletePropertyDialog } from "@/components/properties/delete-property-dialog";
import { DuplicatePropertyDialog } from "@/components/properties/duplicate-property-dialog";
import { DataTable, useDataTableState } from "@/components/data-table";
import type { DataTableColumn, DataTableFilter } from "@/components/data-table";
import { useCurrency } from "@/lib/hooks/use-currency";
import { PROPERTY_STATUS, PROPERTY_TYPES } from "@repo/shared/types";

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

const STATUS_COLORS: Record<string, string> = {
  rented:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  vacant: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  owner_occupied:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fix_flip:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  renovation:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  sale_planned:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

interface PropertyItem {
  id: string;
  type: string;
  status: string;
  street: string | null;
  city: string | null;
  zipCode: string | null;
  livingAreaSqm: number;
  purchasePrice: number;
  purchaseDate: string;
  marketValue: number | null;
  thumbnailPath: string | null;
  unitCount: number;
  latitude: string | null;
  longitude: string | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
}

export default function PropertiesPage() {
  const router = useRouter();
  const t = useTranslations("properties");
  const { formatCurrency } = useCurrency();

  const tableState = useDataTableState({
    syncWithUrl: true,
    defaultSortColumn: "createdAt",
    defaultSortOrder: "desc",
  });

  // Dialog states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  const {
    data: propertiesData,
    isLoading,
    isFetching,
  } = trpc.properties.list.useQuery({
    search: tableState.debouncedSearch || undefined,
    status: tableState.filters.status ?? undefined,
    type: tableState.filters.type ?? undefined,
    sortBy: (tableState.sortColumn as SortBy) || "createdAt",
    sortOrder: tableState.sortOrder,
    page: tableState.page,
    pageSize: tableState.pageSize,
  });

  const { data: kpis, isLoading: kpisLoading } =
    trpc.properties.getAggregatedKpis.useQuery();

  const handlePropertyClick = (row: PropertyItem) => {
    router.push(`/properties/${row.id}`);
  };

  const columns = useMemo<DataTableColumn<PropertyItem>[]>(
    () => [
      {
        id: "thumbnail",
        header: "",
        className: "w-[50px]",
        accessorFn: (row) => {
          const thumbnailUrl = row.thumbnailPath
            ? `/api/uploads/${row.thumbnailPath}`
            : null;
          return thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        },
      },
      {
        id: "city",
        header: t("table.address"),
        sortable: true,
        accessorFn: (row) => {
          const address = [row.street, row.zipCode, row.city]
            .filter(Boolean)
            .join(", ");
          return (
            <span className="font-medium">{address || t("noAddress")}</span>
          );
        },
      },
      {
        id: "type",
        header: t("table.type"),
        accessorFn: (row) => t(`types.${row.type}`),
      },
      {
        id: "status",
        header: t("table.status"),
        accessorFn: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-800"}`}
          >
            {t(`status.${row.status}`)}
          </span>
        ),
      },
      {
        id: "livingAreaSqm",
        header: t("table.area"),
        sortable: true,
        accessorFn: (row) => `${row.livingAreaSqm} m²`,
      },
      {
        id: "purchasePrice",
        header: t("table.purchasePrice"),
        sortable: true,
        accessorFn: (row) => formatCurrency(row.purchasePrice),
      },
      {
        id: "marketValue",
        header: t("table.marketValue"),
        sortable: true,
        accessorFn: (row) =>
          row.marketValue ? formatCurrency(row.marketValue) : "-",
      },
      {
        id: "units",
        header: t("table.units"),
        accessorFn: (row) => row.unitCount,
      },
    ],
    [t, formatCurrency],
  );

  const filters = useMemo<DataTableFilter[]>(
    () => [
      {
        key: "status",
        label: t("filterByStatus"),
        placeholder: t("allStatuses"),
        options: Object.values(PROPERTY_STATUS).map((status) => ({
          value: status,
          label: t(`status.${status}`),
        })),
      },
      {
        key: "type",
        label: t("filterByType"),
        placeholder: t("allTypes"),
        options: Object.values(PROPERTY_TYPES).map((type) => ({
          value: type,
          label: t(`types.${type}`),
        })),
      },
    ],
    [t],
  );

  const renderRowActions = (row: PropertyItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setEditId(row.id)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDuplicateId(row.id)}>
          <Copy className="mr-2 h-4 w-4" />
          {t("duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setDeleteId(row.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("deleteAction")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap((prev) => !prev)}
        >
          {showMap ? (
            <>
              <PanelRightClose className="mr-1.5 h-4 w-4" />
              {t("hideMap")}
            </>
          ) : (
            <>
              <Map className="mr-1.5 h-4 w-4" />
              {t("showMap")}
            </>
          )}
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

      {/* Split layout: DataTable + Map */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* DataTable */}
        <div className={showMap ? "min-w-0 lg:w-1/2" : "w-full"}>
          <DataTable<PropertyItem>
            columns={columns}
            data={propertiesData?.items ?? []}
            total={propertiesData?.total ?? 0}
            page={tableState.page}
            pageSize={tableState.pageSize}
            totalPages={propertiesData?.totalPages ?? 0}
            isLoading={isLoading}
            isFetching={isFetching}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
            searchValue={tableState.search}
            onSearchChange={tableState.setSearch}
            searchPlaceholder={t("searchPlaceholder")}
            sortColumn={tableState.sortColumn}
            sortOrder={tableState.sortOrder}
            onSortChange={tableState.setSort}
            filters={filters}
            activeFilters={tableState.filters}
            onFilterChange={tableState.setFilter}
            getRowId={(row) => row.id}
            onRowClick={handlePropertyClick}
            renderRowActions={renderRowActions}
            toolbarActions={
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("addProperty")}
              </Button>
            }
            labels={{
              noResults: t("table.noResults"),
              rowsPerPage: t("table.rowsPerPage"),
              of: t("table.of"),
              selected: t("table.selected"),
            }}
          />
        </div>

        {/* Map — sticky sidebar (50% on lg+, full width stacked on mobile) */}
        {showMap && propertiesData && propertiesData.items.length > 0 && (
          <div className="w-full lg:w-1/2">
            <div className="lg:sticky lg:top-20">
              <Suspense
                fallback={
                  <Skeleton className="h-[380px] w-full rounded-lg lg:h-[calc(95vh-12rem)]" />
                }
              >
                <div className="overflow-hidden rounded-lg border">
                  <PropertyMap
                    properties={propertiesData.items}
                    onMarkerClick={(id) => router.push(`/properties/${id}`)}
                    className="h-[380px] w-full lg:h-[calc(95vh-12rem)]"
                  />
                </div>
              </Suspense>
            </div>
          </div>
        )}
      </div>

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
