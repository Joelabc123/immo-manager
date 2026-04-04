"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  filePath: string;
  mimeType: string;
}

export function DocumentPreview({
  open,
  onOpenChange,
  fileName,
  filePath,
  mimeType,
}: DocumentPreviewProps) {
  const t = useTranslations("documents");
  const [zoom, setZoom] = useState(1);
  const fileUrl = `/api/uploads/${filePath}`;
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setZoom(1);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <div className="flex items-center gap-1">
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {isImage && (
            <div className="flex items-center justify-center overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full transition-transform"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                }}
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded border"
              title={fileName}
            />
          )}

          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                {t("preview")} not available for this file type.
              </p>
              <Button onClick={handleDownload}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {t("download")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
