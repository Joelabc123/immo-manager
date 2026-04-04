"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Image as ImageIcon,
  File,
  Eye,
  Pencil,
  Trash2,
  FolderOpen,
  Plus,
} from "lucide-react";
import { DOCUMENT_CATEGORIES } from "@repo/shared/types";
import { formatDate } from "@repo/shared/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { DocumentPreview } from "./document-preview";
import {
  RenameDialog,
  RecategorizeDialog,
  DeleteDocumentDialog,
} from "./document-actions";

interface DocumentsSectionProps {
  propertyId: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsSection({ propertyId }: DocumentsSectionProps) {
  const t = useTranslations("documents");
  const { data: documents } = trpc.documents.getByProperty.useQuery({
    propertyId,
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    fileName: string;
    filePath: string;
    mimeType: string;
  } | null>(null);
  const [renameDoc, setRenameDoc] = useState<{
    id: string;
    fileName: string;
  } | null>(null);
  const [recategorizeDoc, setRecategorizeDoc] = useState<{
    id: string;
    category: string;
  } | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<{
    id: string;
    fileName: string;
  } | null>(null);

  // Group documents by category
  const grouped = Object.values(DOCUMENT_CATEGORIES).reduce(
    (acc, cat) => {
      const docs = documents?.filter((d) => d.category === cat) ?? [];
      if (docs.length > 0) {
        acc[cat] = docs;
      }
      return acc;
    },
    {} as Record<string, typeof documents>,
  );

  const totalCount = documents?.length ?? 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {t("title")} ({totalCount})
          </CardTitle>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("upload")}
          </Button>
        </CardHeader>
        <CardContent>
          {totalCount === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, docs]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium mb-2">
                    {t(`categories.${category}`)}
                  </h4>
                  <div className="space-y-1">
                    {docs?.map((doc) => {
                      const Icon = getFileIcon(doc.mimeType);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">
                              {doc.fileName}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatFileSize(doc.fileSize)}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDate(
                                doc.createdAt.toISOString().split("T")[0],
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setPreviewDoc({
                                  fileName: doc.fileName,
                                  filePath: doc.filePath,
                                  mimeType: doc.mimeType,
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setRenameDoc({
                                  id: doc.id,
                                  fileName: doc.fileName,
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setRecategorizeDoc({
                                  id: doc.id,
                                  category: doc.category,
                                })
                              }
                            >
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 cursor-pointer"
                              >
                                {t(`categories.${doc.category}`).slice(0, 3)}
                              </Badge>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setDeleteDoc({
                                  id: doc.id,
                                  fileName: doc.fileName,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UploadDocumentDialog
        propertyId={propertyId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {previewDoc && (
        <DocumentPreview
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          {...previewDoc}
        />
      )}

      {renameDoc && (
        <RenameDialog
          open={!!renameDoc}
          onOpenChange={(open) => !open && setRenameDoc(null)}
          documentId={renameDoc.id}
          currentName={renameDoc.fileName}
          propertyId={propertyId}
        />
      )}

      {recategorizeDoc && (
        <RecategorizeDialog
          open={!!recategorizeDoc}
          onOpenChange={(open) => !open && setRecategorizeDoc(null)}
          documentId={recategorizeDoc.id}
          currentCategory={recategorizeDoc.category}
          propertyId={propertyId}
        />
      )}

      {deleteDoc && (
        <DeleteDocumentDialog
          open={!!deleteDoc}
          onOpenChange={(open) => !open && setDeleteDoc(null)}
          documentId={deleteDoc.id}
          fileName={deleteDoc.fileName}
          propertyId={propertyId}
        />
      )}
    </>
  );
}
