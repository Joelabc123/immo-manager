"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Paperclip, Download, FileUp, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Attachment {
  filename: string;
  contentType: string;
  size: number;
}

interface AttachmentListProps {
  emailId: string;
  attachments: Attachment[];
}

export function AttachmentList({ emailId, attachments }: AttachmentListProps) {
  const t = useTranslations("email");
  const [transferTarget, setTransferTarget] = useState<Attachment | null>(null);

  const { data: transferred } = trpc.documents.getTransferredByEmail.useQuery(
    { emailId },
    { enabled: attachments?.length > 0 },
  );

  const transferredFilenames = new Set(
    transferred?.map((t) => t.sourceFilename) ?? [],
  );

  if (!attachments?.length) return null;

  return (
    <div className="flex flex-col gap-2 border-t p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        {t("attachments.title", { count: attachments.length })}
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att, idx) => {
          const isSaved = transferredFilenames.has(att.filename);
          return (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
            >
              <span className="max-w-40 truncate">{att.filename}</span>
              <span className="text-muted-foreground">
                {formatFileSize(att.size)}
              </span>
              {isSaved ? (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1 px-1.5 py-0"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {t("attachments.saved")}
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setTransferTarget(att)}
                  title={t("attachments.transfer")}
                >
                  <FileUp className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {transferTarget && (
        <TransferAttachmentDialog
          open={!!transferTarget}
          onOpenChange={(open) => !open && setTransferTarget(null)}
          emailId={emailId}
          filename={transferTarget.filename}
        />
      )}
    </div>
  );
}

function TransferAttachmentDialog({
  open,
  onOpenChange,
  emailId,
  filename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailId: string;
  filename: string;
}) {
  const t = useTranslations("email");
  const [propertyId, setPropertyId] = useState("");
  const utils = trpc.useUtils();

  const { data: propertiesData } = trpc.properties.list.useQuery(
    { page: 1, pageSize: 100 },
    { enabled: open },
  );

  const transferMutation = trpc.email.transferAttachment.useMutation({
    onSuccess: () => {
      utils.documents.getTransferredByEmail.invalidate({ emailId });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("attachments.transferTitle")}</DialogTitle>
          <DialogDescription>
            {t("attachments.transferDescription", { filename })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>{t("assign.property")}</Label>
            <Select
              value={propertyId}
              onValueChange={(val) => setPropertyId(val ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {propertiesData?.items?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.street}, {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={() =>
              transferMutation.mutate({
                emailId,
                filename,
                propertyId,
                category: "email-attachment",
              })
            }
            disabled={!propertyId || transferMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("attachments.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
