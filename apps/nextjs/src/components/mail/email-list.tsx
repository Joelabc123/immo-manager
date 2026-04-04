"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailListItem } from "./email-list-item";
import { Mail } from "lucide-react";

interface Email {
  id: string;
  fromAddress: string;
  subject: string;
  receivedAt: Date | string;
  isRead: boolean;
  isInbound: boolean;
  tenantId: string | null;
  propertyId: string | null;
  threadId: string | null;
  openedAt: Date | string | null;
}

interface EmailListProps {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  selectedId: string | null;
  showAssign: boolean;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
}

export function EmailList({
  emails,
  total,
  page,
  limit,
  isLoading,
  selectedId,
  showAssign,
  onSelect,
  onPageChange,
}: EmailListProps) {
  const t = useTranslations("email");
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-auto">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={email.id === selectedId}
            showAssign={showAssign}
            onSelect={() => onSelect(email.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t("pagination.prev")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
