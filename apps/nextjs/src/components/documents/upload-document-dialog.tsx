"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@repo/shared/types";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
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

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

interface UploadDocumentDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: DocumentCategory;
}

interface PendingFile {
  file: File;
  customName: string;
}

export function UploadDocumentDialog({
  propertyId,
  open,
  onOpenChange,
  defaultCategory,
}: UploadDocumentDialogProps) {
  const t = useTranslations("documents");
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<DocumentCategory>(
    defaultCategory ?? DOCUMENT_CATEGORIES.other,
  );
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      customName: file.name,
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_MIME_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index: number, name: string) => {
    setPendingFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, customName: name } : f)),
    );
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const { file, customName } = pendingFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("propertyId", propertyId);
        formData.append("category", category);
        formData.append("fileName", customName);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        setUploadProgress(((i + 1) / pendingFiles.length) * 100);
      }

      utils.documents.getByProperty.invalidate({ propertyId });
      utils.documents.list.invalidate();
      utils.documents.getStats.invalidate();
      setPendingFiles([]);
      onOpenChange(false);
    } catch {
      // Error handled silently — user sees progress stalled
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = (value: boolean) => {
    if (!uploading) {
      setPendingFiles([]);
      onOpenChange(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("upload")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category selector */}
          <div className="space-y-1">
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

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dragDrop")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("allowedTypes")} &middot; {t("maxSize")}
            </p>
          </div>

          {/* Pending files list */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingFiles.map((pf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm border rounded-md p-2"
                >
                  <Input
                    value={pf.customName}
                    onChange={(e) => updateFileName(index, e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatFileSize(pf.file.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={uploading}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={pendingFiles.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              t("upload")
            )}
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
