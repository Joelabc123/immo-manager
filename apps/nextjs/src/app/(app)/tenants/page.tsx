"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Users } from "lucide-react";
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
import { TenantCard } from "@/components/tenants/tenant-card";
import { AddTenantDialog } from "@/components/tenants/add-tenant-dialog";
import { EditTenantDialog } from "@/components/tenants/edit-tenant-dialog";
import { DeleteTenantDialog } from "@/components/tenants/delete-tenant-dialog";

type SortBy = "name" | "rentStart" | "coldRent";

export default function TenantsPage() {
  const t = useTranslations("tenants");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "former" | null>(
    null,
  );
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tenantsData, isLoading } = trpc.tenants.list.useQuery({
    search: search || undefined,
    status: statusFilter ?? undefined,
    propertyId: propertyFilter ?? undefined,
    sortBy,
    sortOrder,
    page,
    pageSize: 20,
  });

  const { data: properties } = trpc.properties.list.useQuery({
    pageSize: 100,
  });

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
            setStatusFilter(
              val === "all" ? null : (val as "active" | "former"),
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="active">{t("statusActive")}</SelectItem>
            <SelectItem value="former">{t("statusFormer")}</SelectItem>
          </SelectContent>
        </Select>

        {properties && properties.items.length > 0 && (
          <Select
            value={propertyFilter ?? "all"}
            onValueChange={(val) => {
              setPropertyFilter(val === "all" ? null : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("filterByProperty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allProperties")}</SelectItem>
              {properties.items.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {[p.street, p.city].filter(Boolean).join(", ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={sortBy}
          onValueChange={(val) => val && setSortBy(val as SortBy)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t("sort.name")}</SelectItem>
            <SelectItem value="rentStart">{t("sort.rentStart")}</SelectItem>
            <SelectItem value="coldRent">{t("sort.coldRent")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
        >
          {sortOrder === "asc" ? "A-Z" : "Z-A"}
        </Button>
      </div>

      {/* Tenant Grid */}
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
      ) : tenantsData && tenantsData.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tenantsData.items.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onEdit={setEditId}
                onDelete={setDeleteId}
              />
            ))}
          </div>

          {/* Pagination */}
          {tenantsData.totalPages > 1 && (
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
                {page} / {tenantsData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= tenantsData.totalPages}
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
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{t("noTenants")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("noTenantsDescription")}
          </p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addTenant")}
          </Button>
        </div>
      )}

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
