"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThumbnailUploadProps {
  propertyId: string;
  currentPath: string | null;
  onUploadComplete: (path: string) => void;
}

function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * Math.min(ratio, 1);
      canvas.height = img.height * Math.min(ratio, 1);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        file.type,
        quality,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function ThumbnailUpload({
  propertyId,
  currentPath,
  onUploadComplete,
}: ThumbnailUploadProps) {
  const t = useTranslations("properties");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    currentPath ? `/api/uploads/${currentPath}` : null,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed, file.name);
        formData.append("propertyId", propertyId);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();
        setPreview(`/api/uploads/${result.path}`);
        onUploadComplete(result.path);
      } catch {
        // Upload error silently handled - user sees no preview change
      } finally {
        setUploading(false);
      }
    },
    [propertyId, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
  });

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob-URL preview before upload */}
          <img
            src={preview}
            alt="Thumbnail"
            className="h-40 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-1 right-1 rounded-full bg-background/80 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {uploading ? t("uploading") : t("dropThumbnail")}
          </p>
        </div>
      )}
    </div>
  );
}
