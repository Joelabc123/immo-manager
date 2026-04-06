"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  useDataTableState,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/data-table";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import { AUDIT_ACTIONS } from "@repo/shared/types";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

type AuditItem =
  inferRouterOutputs<AppRouter>["audit"]["list"]["items"][number];

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionVariant(
  action: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (action) {
    case "create":
      return "default";
    case "delete":
      return "destructive";
    case "update":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AuditPage() {
  const t = useTranslations("audit");

  const tableState = useDataTableState({
    syncWithUrl: true,
    defaultSortColumn: "createdAt",
    defaultSortOrder: "desc",
  });

  const { data, isLoading, isFetching } = trpc.audit.list.useQuery({
    search: tableState.debouncedSearch || undefined,
    entityType: (tableState.filters.entityType as AuditItem["entityType"]) ?? undefined,
    action: (tableState.filters.action as AuditItem["action"]) ?? undefined,
    sortBy: (tableState.sortColumn ?? "createdAt") as
      | "createdAt"
      | "action"
      | "entityType"
      | "fieldName",
    sortOrder: tableState.sortOrder,
    page: tableState.page,
    pageSize: tableState.pageSize,
  });

  const columns = useMemo<DataTableColumn<AuditItem>[]>(
    () => [
      {
        id: "createdAt",
        header: t("table.date"),
        sortable: true,
        accessorFn: (row) => (
          <span className="text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        id: "action",
        header: t("table.action"),
        sortable: true,
        accessorFn: (row) => (
          <Badge variant={getActionVariant(row.action)}>
            {t(`actions.${row.action}` as "actions.create")}
          </Badge>
        ),
      },
      {
        id: "entityType",
        header: t("table.entityType"),
        sortable: true,
        accessorFn: (row) =>
          t(`entityTypes.${row.entityType}` as "entityTypes.property"),
      },
      {
        id: "fieldName",
        header: t("table.field"),
        sortable: true,
        accessorFn: (row) => (
          <span className="font-mono text-xs">{row.fieldName ?? "-"}</span>
        ),
      },
      {
        id: "oldValue",
        header: t("table.oldValue"),
        className: "max-w-[200px]",
        accessorFn: (row) => (
          <span className="truncate text-xs">{row.oldValue ?? "-"}</span>
        ),
      },
      {
        id: "newValue",
        header: t("table.newValue"),
        className: "max-w-[200px]",
        accessorFn: (row) => (
          <span className="truncate text-xs">{row.newValue ?? "-"}</span>
        ),
      },
    ],
    [t],
  );

  const filters = useMemo<DataTableFilter[]>(
    () => [
      {
        key: "entityType",
        label: t("allEntities"),
        options: Object.values(AUDIT_ENTITY_TYPES).map((et) => ({
          value: et,
          label: t(`entityTypes.${et}` as "entityTypes.property"),
        })),
      },
      {
        key: "action",
        label: t("allActions"),
        options: Object.values(AUDIT_ACTIONS).map((a) => ({
          value: a,
          label: t(`actions.${a}` as "actions.create"),
        })),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* DataTable */}
      <DataTable<AuditItem>
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={tableState.page}
        pageSize={tableState.pageSize}
        totalPages={data?.totalPages ?? 0}
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
        labels={{
          noResults: t("noEntries"),
          rowsPerPage: t("table.rowsPerPage"),
          of: t("table.of"),
        }}
      />
    </div>
  );
}
