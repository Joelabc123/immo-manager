"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ClipboardList } from "lucide-react";
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
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { AUDIT_ENTITY_TYPES } from "@repo/shared/types";
import { AUDIT_ACTIONS } from "@repo/shared/types";

const ENTITY_TYPE_VALUES = Object.values(AUDIT_ENTITY_TYPES);
const ACTION_VALUES = Object.values(AUDIT_ACTIONS);

export default function AuditPage() {
  const t = useTranslations("audit");

  const [entityType, setEntityType] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.audit.list.useQuery({
    entityType: entityType ?? undefined,
    action: action ?? undefined,
    entityId: search || undefined,
    page,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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
          value={entityType ?? "all"}
          onValueChange={(val) => {
            setEntityType(val === "all" ? null : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterByEntity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allEntities")}</SelectItem>
            {ENTITY_TYPE_VALUES.map((et) => (
              <SelectItem key={et} value={et}>
                {t(`entityTypes.${et}` as "entityTypes.property")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={action ?? "all"}
          onValueChange={(val) => {
            setAction(val === "all" ? null : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filterByAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allActions")}</SelectItem>
            {ACTION_VALUES.map((a) => (
              <SelectItem key={a} value={a}>
                {t(`actions.${a}` as "actions.create")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data ? (
        <>
          <AuditLogTable items={data.items} />

          {/* Pagination */}
          {data.totalPages > 1 && (
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
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
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
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{t("noEntries")}</h3>
        </div>
      )}
    </div>
  );
}
