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
  Search,
  HardDrive,
} from "lucide-react";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@repo/shared/types";
import { formatDate } from "@repo/shared/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { DocumentPreview } from "@/components/documents/document-preview";
import {
  RenameDialog,
  RecategorizeDialog,
  DeleteDocumentDialog,
} from "@/components/documents/document-actions";

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

export default function DocumentsPage() {
  const t = useTranslations("documents");

  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Upload dialog needs a propertyId — we let the user pick from their properties
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPropertyId, setUploadPropertyId] = useState<string>("");

  const [previewDoc, setPreviewDoc] = useState<{
    fileName: string;
    filePath: string;
    mimeType: string;
  } | null>(null);
  const [renameDoc, setRenameDoc] = useState<{
    id: string;
    fileName: string;
    propertyId: string;
  } | null>(null);
  const [recategorizeDoc, setRecategorizeDoc] = useState<{
    id: string;
    category: string;
    propertyId: string;
  } | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<{
    id: string;
    fileName: string;
    propertyId: string;
  } | null>(null);

  const { data: propertiesList } = trpc.properties.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  const { data: stats } = trpc.documents.getStats.useQuery();

  const { data: documentsData, isLoading } = trpc.documents.list.useQuery({
    propertyId: filterProperty || undefined,
    category: (filterCategory as DocumentCategory) || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const totalPages = documentsData ? Math.ceil(documentsData.total / limit) : 0;

  const handleUploadClick = () => {
    if (propertiesList?.items && propertiesList.items.length > 0) {
      setUploadPropertyId(propertiesList.items[0].id);
      setUploadOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={handleUploadClick}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("upload")}
        </Button>
      </div>

      {/* KPI bar */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {stats?.overall.totalCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("totalDocuments")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <HardDrive className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {formatFileSize(stats?.overall.totalSize ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">{t("totalSize")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterProperty}
          onValueChange={(v) => {
            setFilterProperty(v === "__all__" ? "" : (v ?? ""));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("filterByProperty")}>
              {(value: string) => {
                if (value === "__all__") return t("allProperties");
                const prop = propertiesList?.items.find(
                  (item) => item.id === value,
                );
                return prop
                  ? [prop.street, prop.city].filter(Boolean).join(", ") ||
                      prop.id.slice(0, 8)
                  : value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allProperties")}</SelectItem>
            {propertiesList?.items.map((prop) => {
              const displayName =
                [prop.street, prop.city].filter(Boolean).join(", ") ||
                prop.id.slice(0, 8);
              return (
                <SelectItem key={prop.id} value={prop.id} label={displayName}>
                  {displayName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select
          value={filterCategory}
          onValueChange={(v) => {
            setFilterCategory(v === "__all__" ? "" : (v ?? ""));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("filterByCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allCategories")}</SelectItem>
            {Object.values(DOCUMENT_CATEGORIES).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`categories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !documentsData || documentsData.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("noDocuments")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {documentsData.items.map((doc) => {
                const Icon = getFileIcon(doc.mimeType);
                const propertyLabel = [doc.propertyStreet, doc.propertyCity]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-2.5 px-4 hover:bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{propertyLabel}</span>
                          <span>&middot;</span>
                          <span>{t(`categories.${doc.category}`)}</span>
                          <span>&middot;</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>&middot;</span>
                          <span>
                            {formatDate(
                              doc.createdAt.toISOString().split("T")[0],
                            )}
                          </span>
                        </div>
                      </div>
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
                            propertyId: doc.propertyId,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          setDeleteDoc({
                            id: doc.id,
                            fileName: doc.fileName,
                            propertyId: doc.propertyId,
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
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            &laquo;
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            &raquo;
          </Button>
        </div>
      )}

      {/* Dialogs */}
      {uploadPropertyId && (
        <UploadDocumentDialog
          propertyId={uploadPropertyId}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
        />
      )}

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
          propertyId={renameDoc.propertyId}
        />
      )}

      {recategorizeDoc && (
        <RecategorizeDialog
          open={!!recategorizeDoc}
          onOpenChange={(open) => !open && setRecategorizeDoc(null)}
          documentId={recategorizeDoc.id}
          currentCategory={recategorizeDoc.category}
          propertyId={recategorizeDoc.propertyId}
        />
      )}

      {deleteDoc && (
        <DeleteDocumentDialog
          open={!!deleteDoc}
          onOpenChange={(open) => !open && setDeleteDoc(null)}
          documentId={deleteDoc.id}
          fileName={deleteDoc.fileName}
          propertyId={deleteDoc.propertyId}
        />
      )}
    </div>
  );
}
