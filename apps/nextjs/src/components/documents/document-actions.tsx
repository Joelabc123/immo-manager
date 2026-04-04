"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@repo/shared/types";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentName: string;
  propertyId: string;
}

export function RenameDialog({
  open,
  onOpenChange,
  documentId,
  currentName,
  propertyId,
}: RenameDialogProps) {
  const t = useTranslations("documents");
  const utils = trpc.useUtils();
  const [name, setName] = useState(currentName);

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => {
      utils.documents.getByProperty.invalidate({ propertyId });
      utils.documents.list.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("rename")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("fileName")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("../common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            onClick={() =>
              updateMutation.mutate({ id: documentId, fileName: name })
            }
            disabled={updateMutation.isPending || !name.trim()}
          >
            {t("../common.save", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RecategorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentCategory: string;
  propertyId: string;
}

export function RecategorizeDialog({
  open,
  onOpenChange,
  documentId,
  currentCategory,
  propertyId,
}: RecategorizeDialogProps) {
  const t = useTranslations("documents");
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<DocumentCategory>(
    currentCategory as DocumentCategory,
  );

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => {
      utils.documents.getByProperty.invalidate({ propertyId });
      utils.documents.list.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("recategorize")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("category")}</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              if (v !== null) setCategory(v as DocumentCategory);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DOCUMENT_CATEGORIES).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("../common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            onClick={() => updateMutation.mutate({ id: documentId, category })}
            disabled={updateMutation.isPending}
          >
            {t("../common.save", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  fileName: string;
  propertyId: string;
}

export function DeleteDocumentDialog({
  open,
  onOpenChange,
  documentId,
  fileName,
  propertyId,
}: DeleteDocumentDialogProps) {
  const t = useTranslations("documents");
  const utils = trpc.useUtils();

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.getByProperty.invalidate({ propertyId });
      utils.documents.list.invalidate();
      utils.documents.getStats.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("../common.delete", { defaultValue: "Delete" })}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("deleteConfirm")}</p>
        <p className="text-sm font-medium">{fileName}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("../common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate({ id: documentId })}
            disabled={deleteMutation.isPending}
          >
            {t("../common.delete", { defaultValue: "Delete" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
