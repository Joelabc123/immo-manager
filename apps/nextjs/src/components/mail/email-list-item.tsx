"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@repo/shared/utils";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, Send, Eye } from "lucide-react";

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

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  showAssign: boolean;
  onSelect: () => void;
}

export function EmailListItem({
  email,
  isSelected,
  onSelect,
}: EmailListItemProps) {
  const date = new Date(email.receivedAt);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted",
        !email.isRead && "bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          {email.isInbound ? (
            email.isRead ? (
              <MailOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
            )
          ) : (
            <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn("truncate text-sm", !email.isRead && "font-semibold")}
          >
            {email.fromAddress}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {email.openedAt && <Eye className="h-3 w-3 text-green-500" />}
          <span className="text-xs text-muted-foreground">
            {formatDate(date)}
          </span>
        </div>
      </div>

      <span
        className={cn(
          "truncate text-sm",
          email.isRead ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {email.subject || "(No Subject)"}
      </span>

      {email.tenantId && (
        <Badge variant="secondary" className="w-fit text-xs">
          Tenant
        </Badge>
      )}
    </button>
  );
}
