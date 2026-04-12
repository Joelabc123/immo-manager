"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, User, Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  useDataTableState,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/data-table";
import { AddTenantDialog } from "@/components/tenants/add-tenant-dialog";
import { EditTenantDialog } from "@/components/tenants/edit-tenant-dialog";
import { DeleteTenantDialog } from "@/components/tenants/delete-tenant-dialog";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";

export default function TenantsPage() {
  const t = useTranslations("tenants");
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const tableState = useDataTableState({
    syncWithUrl: true,
    defaultSortColumn: "name",
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: tenantsData,
    isLoading,
    isFetching,
  } = trpc.tenants.list.useQuery({
    search: tableState.debouncedSearch || undefined,
    status: tableState.filters.status as "active" | "former" | undefined,
    propertyId: tableState.filters.property || undefined,
    sortBy: (tableState.sortColumn ?? "name") as
      | "name"
      | "rentStart"
      | "coldRent",
    sortOrder: tableState.sortOrder,
    page: tableState.page,
    pageSize: tableState.pageSize,
  });

  const { data: properties } = trpc.properties.list.useQuery({
    pageSize: 100,
  });

  type TenantItem = NonNullable<typeof tenantsData>["items"][number];

  const columns = useMemo<DataTableColumn<TenantItem>[]>(
    () => [
      {
        id: "name",
        header: t("table.name"),
        sortable: true,
        accessorFn: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-medium">
              {row.firstName} {row.lastName}
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessorFn: (row) => {
          const today = new Date().toISOString().split("T")[0];
          const isFormer = row.rentEnd && row.rentEnd < today;
          return (
            <Badge
              className={
                isFormer
                  ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              }
            >
              {isFormer ? t("former") : t("active")}
            </Badge>
          );
        },
      },
      {
        id: "unit",
        header: t("table.unit"),
        accessorFn: (row) => {
          if (!row.unitInfo)
            return <span className="text-muted-foreground">—</span>;
          const address = [
            row.unitInfo.propertyStreet,
            row.unitInfo.propertyCity,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <div>
              <div className="font-medium">{row.unitInfo.unitName}</div>
              {address && (
                <div className="text-xs text-muted-foreground">{address}</div>
              )}
            </div>
          );
        },
      },
      {
        id: "coldRent",
        header: t("table.coldRent"),
        sortable: true,
        accessorFn: (row) => formatCurrency(row.coldRent),
      },
      {
        id: "warmRent",
        header: t("table.warmRent"),
        accessorFn: (row) => formatCurrency(row.warmRent),
      },
      {
        id: "rentStart",
        header: t("table.rentStart"),
        sortable: true,
        accessorFn: (row) => formatDate(row.rentStart),
      },
    ],
    [t, formatCurrency],
  );

  const filters = useMemo<DataTableFilter[]>(() => {
    const defs: DataTableFilter[] = [
      {
        key: "status",
        label: t("filterByStatus"),
        placeholder: t("allStatuses"),
        options: [
          { value: "active", label: t("statusActive") },
          { value: "former", label: t("statusFormer") },
        ],
      },
    ];

    if (properties && properties.items.length > 0) {
      defs.push({
        key: "property",
        label: t("filterByProperty"),
        placeholder: t("allProperties"),
        options: properties.items.map((p) => ({
          value: p.id,
          label: [p.street, p.city].filter(Boolean).join(", "),
        })),
      });
    }

    return defs;
  }, [t, properties]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addTenant")}
        </Button>
      </div>

      {/* Tenant Table */}
      <DataTable<TenantItem>
        columns={columns}
        data={tenantsData?.items ?? []}
        total={tenantsData?.total ?? 0}
        page={tableState.page}
        pageSize={tableState.pageSize}
        totalPages={tenantsData?.totalPages ?? 0}
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
        searchClassName="flex-[7] min-w-0"
        filterClassName="w-auto flex-[1.5] min-w-0"
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/tenants/${row.id}`)}
        renderRowActions={(row) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditId(row.id)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteId(row.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
        labels={{
          noResults: t("noTenants"),
          rowsPerPage: t("table.rowsPerPage"),
          of: t("table.of"),
        }}
      />

      {/* Dialogs */}
      <AddTenantDialog open={addOpen} onOpenChange={setAddOpen} />

      {editId && (
        <EditTenantDialog
          tenantId={editId}
          open={!!editId}
          onOpenChange={(open) => !open && setEditId(null)}
        />
      )}

      {deleteId && (
        <DeleteTenantDialog
          tenantId={deleteId}
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        />
      )}
    </div>
  );
}
