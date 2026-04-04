"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

type AuditItem =
  inferRouterOutputs<AppRouter>["audit"]["list"]["items"][number];

interface AuditLogTableProps {
  items: AuditItem[];
}

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

export function AuditLogTable({ items }: AuditLogTableProps) {
  const t = useTranslations("audit");

  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {t("noEntries")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("table.date")}</TableHead>
          <TableHead>{t("table.action")}</TableHead>
          <TableHead>{t("table.entityType")}</TableHead>
          <TableHead>{t("table.field")}</TableHead>
          <TableHead>{t("table.oldValue")}</TableHead>
          <TableHead>{t("table.newValue")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="text-muted-foreground">
              {formatDate(item.createdAt)}
            </TableCell>
            <TableCell>
              <Badge variant={getActionVariant(item.action)}>
                {t(`actions.${item.action}` as "actions.create")}
              </Badge>
            </TableCell>
            <TableCell>
              {t(`entityTypes.${item.entityType}` as "entityTypes.property")}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {item.fieldName ?? "-"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-xs">
              {item.oldValue ?? "-"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-xs">
              {item.newValue ?? "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
