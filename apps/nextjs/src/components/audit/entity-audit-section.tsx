"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditLogTable } from "@/components/audit/audit-log-table";

interface EntityAuditSectionProps {
  entityType: string;
  entityId: string;
}

export function EntityAuditSection({
  entityType,
  entityId,
}: EntityAuditSectionProps) {
  const t = useTranslations("audit");
  const [page, setPage] = useState(1);

  const { data } = trpc.audit.getByEntity.useQuery({
    entityType,
    entityId,
    page,
    limit: 10,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("sectionTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <AuditLogTable items={data?.items ?? []} />
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
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
      </CardContent>
    </Card>
  );
}
