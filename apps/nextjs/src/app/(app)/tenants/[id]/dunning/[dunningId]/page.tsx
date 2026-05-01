"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Archive,
  CheckCircle,
  Download,
  XCircle,
} from "lucide-react";
import { DOCUMENT_CATEGORIES, DUNNING_STATUSES } from "@repo/shared/types";
import { formatDate } from "@repo/shared/utils";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useUser } from "@/components/user-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  downloadDunningSnapshotPdf,
  generateDunningSnapshotPdfBlob,
  type DunningSnapshotPdfData,
} from "@/components/documents/pdf/dunning-pdf";

interface DunningReaderPageProps {
  params: Promise<{ id: string; dunningId: string }>;
}

export default function DunningReaderPage({ params }: DunningReaderPageProps) {
  const { id, dunningId } = use(params);
  const router = useRouter();
  const t = useTranslations("dunning");
  const { formatCurrency, currency, locale } = useCurrency();
  const { user } = useUser();
  const utils = trpc.useUtils();
  const [isPdfBusy, setIsPdfBusy] = useState(false);

  const { data, isLoading } = trpc.dunning.getById.useQuery({ id: dunningId });
  const cancelMutation = trpc.dunning.cancel.useMutation({
    onSuccess: () => utils.dunning.getById.invalidate({ id: dunningId }),
  });
  const resolveMutation = trpc.dunning.markResolved.useMutation({
    onSuccess: () => utils.dunning.getById.invalidate({ id: dunningId }),
  });
  const archiveMutation = trpc.dunning.archiveGeneratedPdf.useMutation({
    onSuccess: () => utils.dunning.getById.invalidate({ id: dunningId }),
  });
  const logDownloadMutation = trpc.dunning.logDownload.useMutation();

  const pdfData = useMemo<DunningSnapshotPdfData | null>(() => {
    if (!data) return null;

    return {
      subject: data.record.subjectSnapshot ?? t("fallbackSubject"),
      body: data.record.bodySnapshot ?? "",
      amount: data.record.amount,
      feeAmount: data.record.feeAmount,
      totalAmount: data.record.totalAmount ?? data.record.amount,
      dunningDate: data.record.dunningDate,
      paymentDeadline: data.record.paymentDeadline,
      tenant: {
        firstName: data.tenant.firstName,
        lastName: data.tenant.lastName,
      },
      property: {
        street: data.tenant.propertyStreet,
        zipCode: data.tenant.propertyZipCode,
        city: data.tenant.propertyCity,
      },
      rentalUnit: data.tenant.rentalUnitName
        ? { name: data.tenant.rentalUnitName }
        : null,
      senderName: user?.name ?? "Immo Manager",
      senderAddress: user?.email ?? "",
    };
  }, [data, t, user?.email, user?.name]);

  const handleDownload = async () => {
    if (!pdfData) return;
    setIsPdfBusy(true);
    try {
      await logDownloadMutation.mutateAsync({ id: dunningId });
      await downloadDunningSnapshotPdf(pdfData, currency, locale);
    } finally {
      setIsPdfBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!pdfData || !data?.tenant.propertyId) return;
    setIsPdfBusy(true);
    try {
      const blob = await generateDunningSnapshotPdfBlob(
        pdfData,
        currency,
        locale,
      );
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], `mahnung-${data.record.id}.pdf`, {
          type: "application/pdf",
        }),
      );
      formData.append("propertyId", data.tenant.propertyId);
      formData.append("category", DOCUMENT_CATEGORIES.dunning_letter);
      formData.append("fileName", pdfData.subject);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload PDF");
      const result = (await response.json()) as { documentId?: string };
      if (!result.documentId) throw new Error("Missing document id");

      await archiveMutation.mutateAsync({
        id: dunningId,
        documentId: result.documentId,
      });
    } finally {
      setIsPdfBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!data || !pdfData) return null;

  const isArchived = data.record.status === DUNNING_STATUSES.archived;
  const isClosed =
    data.record.status === DUNNING_STATUSES.cancelled ||
    data.record.status === DUNNING_STATUSES.resolved;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push(`/tenants/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToTenant")}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void handleDownload()}
            disabled={isPdfBusy}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("downloadPdf")}
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleArchive()}
            disabled={isPdfBusy || isArchived || !data.tenant.propertyId}
          >
            <Archive className="mr-2 h-4 w-4" />
            {t("archivePdf")}
          </Button>
          <Button
            variant="outline"
            onClick={() => resolveMutation.mutate({ id: dunningId })}
            disabled={isClosed || resolveMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t("markResolved")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate({ id: dunningId })}
            disabled={isClosed || cancelMutation.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {t("cancelDunning")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`statuses.${data.record.status}`)}</Badge>
            <Badge variant="outline">
              {t(`documentTypes.${data.record.documentType}`)}
            </Badge>
            <Badge variant="outline">{t(`levels.${data.record.level}`)}</Badge>
          </div>
          <CardTitle>{pdfData.subject}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">{t("dunningDate")}</div>
              <div className="font-medium">
                {formatDate(data.record.dunningDate)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">
                {t("paymentDeadline")}
              </div>
              <div className="font-medium">
                {data.record.paymentDeadline
                  ? formatDate(data.record.paymentDeadline)
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("amount")}</div>
              <div className="font-medium">
                {formatCurrency(data.record.amount)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("totalAmount")}</div>
              <div className="font-medium">
                {formatCurrency(data.record.totalAmount ?? data.record.amount)}
              </div>
            </div>
          </div>

          <Separator />

          <article className="mx-auto max-w-3xl rounded-md border bg-background p-8 shadow-sm">
            <div className="mb-8 text-sm text-muted-foreground">
              {pdfData.tenant.firstName} {pdfData.tenant.lastName}
              {pdfData.property.street && <br />}
              {pdfData.property.street}
              {(pdfData.property.zipCode || pdfData.property.city) && <br />}
              {pdfData.property.zipCode} {pdfData.property.city}
            </div>
            <h1 className="mb-6 text-xl font-semibold">{pdfData.subject}</h1>
            <div className="whitespace-pre-wrap text-sm leading-7">
              {pdfData.body}
            </div>
          </article>

          {data.claims.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">{t("linkedClaims")}</h2>
              <div className="rounded-md border">
                {data.claims.map(({ claim, amountIncluded }) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0"
                  >
                    <span>{claim.description}</span>
                    <span className="font-medium">
                      {formatCurrency(amountIncluded)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.document && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/api/uploads/${data.document.filePath}`} />}
            >
              <Archive className="mr-2 h-4 w-4" />
              {t("openArchivedPdf")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
