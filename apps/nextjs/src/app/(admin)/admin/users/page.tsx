"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { DataTable, useDataTableState } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  emailVerified: boolean;
  language: string;
  createdAt: Date;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const t = useTranslations("admin");

  const tableState = useDataTableState({
    syncWithUrl: true,
    defaultSortColumn: "createdAt",
    defaultSortOrder: "desc",
  });

  const {
    data: usersData,
    isLoading,
    isFetching,
  } = trpc.admin.listUsers.useQuery();

  const items = useMemo(() => (usersData ?? []) as UserItem[], [usersData]);

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    let result = items;

    if (tableState.debouncedSearch) {
      const search = tableState.debouncedSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }

    // Client-side sorting
    const col = tableState.sortColumn;
    const order = tableState.sortOrder;
    if (col) {
      result = [...result].sort((a, b) => {
        const aVal = a[col as keyof UserItem];
        const bVal = b[col as keyof UserItem];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    items,
    tableState.debouncedSearch,
    tableState.sortColumn,
    tableState.sortOrder,
  ]);

  // Client-side pagination
  const pageSize = tableState.pageSize;
  const page = tableState.page;
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const columns = useMemo<DataTableColumn<UserItem>[]>(
    () => [
      {
        id: "name",
        header: t("users.columns.name"),
        accessorKey: "name",
        sortable: true,
      },
      {
        id: "email",
        header: t("users.columns.email"),
        accessorKey: "email",
        sortable: true,
      },
      {
        id: "role",
        header: t("users.columns.role"),
        sortable: true,
        accessorFn: (row) => (
          <Badge variant={row.role === "admin" ? "default" : "secondary"}>
            {row.role === "admin"
              ? t("users.roles.admin")
              : t("users.roles.member")}
          </Badge>
        ),
      },
      {
        id: "banned",
        header: t("users.columns.status"),
        sortable: true,
        accessorFn: (row) =>
          row.banned ? (
            <Badge variant="destructive">{t("users.banned")}</Badge>
          ) : (
            <Badge variant="outline">{t("users.active")}</Badge>
          ),
      },
      {
        id: "emailVerified",
        header: t("users.columns.emailVerified"),
        sortable: true,
        accessorFn: (row) =>
          row.emailVerified ? (
            <Badge variant="outline">{t("users.verified")}</Badge>
          ) : (
            <Badge variant="secondary">{t("users.unverified")}</Badge>
          ),
      },
      {
        id: "createdAt",
        header: t("users.columns.createdAt"),
        sortable: true,
        accessorFn: (row) =>
          new Date(row.createdAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
      },
    ],
    [t],
  );

  const handleRowClick = (row: UserItem) => {
    router.push(`/admin/users/${row.id}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground">{t("users.description")}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pagedItems}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        isFetching={isFetching}
        onPageChange={tableState.setPage}
        onPageSizeChange={tableState.setPageSize}
        searchValue={tableState.search}
        onSearchChange={tableState.setSearch}
        searchPlaceholder={t("users.searchPlaceholder")}
        sortColumn={tableState.sortColumn}
        sortOrder={tableState.sortOrder}
        onSortChange={tableState.setSort}
        getRowId={(row) => row.id}
        onRowClick={handleRowClick}
        labels={{
          noResults: t("users.noResults"),
        }}
      />
    </div>
  );
}
