"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { EmailList } from "@/components/mail/email-list";
import { MailReader } from "@/components/mail/mail-reader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertTriangle,
  Archive,
  FolderOpen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FOLDER_ICONS: Record<string, React.ElementType> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  spam: AlertTriangle,
  archive: Archive,
  custom: FolderOpen,
};

export default function MailPage() {
  const t = useTranslations("email");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const { data: accounts } = trpc.email.getAccounts.useQuery();

  // Auto-select first account if none selected
  const activeAccountId = useMemo(() => {
    if (selectedAccountId) return selectedAccountId;
    return accounts?.[0]?.id ?? null;
  }, [selectedAccountId, accounts]);

  const { data: folders } = trpc.email.listFolders.useQuery(
    { accountId: activeAccountId! },
    { enabled: !!activeAccountId },
  );

  const { data: emailTenants } = trpc.email.tenantsWithEmails.useQuery(
    { accountId: activeAccountId! },
    { enabled: !!activeAccountId },
  );

  const syncMutation = trpc.email.syncNow.useMutation();
  const utils = trpc.useUtils();

  // Build tenant name map for the email list badges
  const tenantNames = useMemo(() => {
    const map = new Map<string, string>();
    if (emailTenants) {
      for (const t of emailTenants) {
        map.set(t.tenantId, `${t.firstName} ${t.lastName}`);
      }
    }
    return map;
  }, [emailTenants]);

  // Determine if "Alle Mails" is active (no folder, no tenant selected)
  const isAllMail = !selectedFolderId && !selectedTenantId;

  const { data, isLoading } = trpc.email.list.useQuery(
    {
      accountId: activeAccountId!,
      folderId: selectedFolderId ?? undefined,
      tenantId: selectedTenantId ?? undefined,
      inboundOnly: isAllMail ? true : undefined,
      page,
      limit: 50,
    },
    { enabled: !!activeAccountId },
  );

  const handleSync = async () => {
    if (!activeAccountId) return;
    await syncMutation.mutateAsync({ accountId: activeAccountId });
    await utils.email.list.invalidate();
    await utils.email.getUnreadCount.invalidate();
    await utils.email.listFolders.invalidate();
    await utils.email.tenantsWithEmails.invalidate();
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedTenantId(null);
    setPage(1);
    setSelectedEmailId(null);
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedFolderId(null);
    setPage(1);
    setSelectedEmailId(null);
  };

  const handleAccountChange = (accountId: string | null) => {
    if (!accountId) return;
    setSelectedAccountId(accountId);
    setSelectedFolderId(null);
    setSelectedTenantId(null);
    setPage(1);
    setSelectedEmailId(null);
  };

  const activeAccount = accounts?.find((a) => a.id === activeAccountId);

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center md:h-[calc(100vh-3rem)]">
        <div className="flex flex-col items-center gap-2 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("noAccount")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 md:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {accounts.length > 1 && (
            <Select
              value={activeAccountId ?? ""}
              onValueChange={handleAccountChange}
            >
              <SelectTrigger className="h-8 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.label || acc.fromAddress}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeAccount?.syncStatus === "syncing" && (
            <span className="text-xs text-muted-foreground">
              {t("syncing")}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending || !activeAccountId}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                syncMutation.isPending && "animate-spin",
              )}
            />
            {t("sync")}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Folder Sidebar */}
        <div
          className={cn(
            "hidden w-48 flex-col gap-1 overflow-auto md:flex",
            selectedEmailId && "md:hidden lg:flex",
          )}
        >
          {/* All Mail */}
          <button
            onClick={() => handleFolderSelect(null)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
              isAllMail && "bg-muted font-medium",
            )}
          >
            <Inbox className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("allMail")}</span>
          </button>

          {/* Folders */}
          {folders?.map((folder) => {
            const Icon = FOLDER_ICONS[folder.type] ?? FolderOpen;
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderSelect(folder.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                  selectedFolderId === folder.id && "bg-muted font-medium",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </div>
                {folder.unreadMessages > 0 && (
                  <span className="text-xs font-medium text-primary">
                    {folder.unreadMessages}
                  </span>
                )}
              </button>
            );
          })}

          {/* Tenants section */}
          {emailTenants && emailTenants.length > 0 && (
            <>
              <div className="my-2 border-t" />
              <div className="flex items-center gap-1 px-2 text-xs font-medium text-muted-foreground">
                <Users className="h-3 w-3" />
                {t("tenants")}
              </div>
              {emailTenants.map((tenant) => (
                <button
                  key={tenant.tenantId}
                  onClick={() => handleTenantSelect(tenant.tenantId)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    selectedTenantId === tenant.tenantId &&
                      "bg-muted font-medium",
                  )}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">
                      {tenant.firstName} {tenant.lastName}
                    </span>
                    {tenant.propertyName && (
                      <span className="truncate text-xs text-muted-foreground">
                        {tenant.propertyName}
                      </span>
                    )}
                  </div>
                  {tenant.unreadCount > 0 && (
                    <span className="text-xs font-medium text-primary">
                      {tenant.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Email List */}
        <div
          className={cn(
            "flex w-full flex-col overflow-auto border rounded-lg md:w-96 md:min-w-96",
            selectedEmailId && "hidden md:flex",
          )}
        >
          <EmailList
            emails={data?.emails ?? []}
            total={data?.total ?? 0}
            page={page}
            limit={50}
            isLoading={isLoading}
            selectedId={selectedEmailId}
            onSelect={setSelectedEmailId}
            onPageChange={setPage}
            tenantNames={tenantNames}
          />
        </div>

        {/* Mail Reader */}
        <div
          className={cn(
            "flex-1 overflow-auto border rounded-lg",
            !selectedEmailId &&
              "hidden md:flex md:items-center md:justify-center",
          )}
        >
          {selectedEmailId ? (
            <MailReader
              emailId={selectedEmailId}
              accountId={activeAccountId!}
              onBack={() => setSelectedEmailId(null)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("selectEmail")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
