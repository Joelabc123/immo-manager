"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { EmailList } from "@/components/mail/email-list";
import { MailReader } from "@/components/mail/mail-reader";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MailPage() {
  const t = useTranslations("email");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [tab, setTab] = useState<"matched" | "unmatched">("matched");
  const [page, setPage] = useState(1);

  const syncMutation = trpc.email.syncNow.useMutation();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.email.list.useQuery({
    page,
    limit: 50,
    matched: tab === "matched",
  });

  const handleSync = async () => {
    await syncMutation.mutateAsync();
    await utils.email.list.invalidate();
    await utils.email.getUnreadCount.invalidate();
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 md:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncMutation.isPending}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => {
            setTab("matched");
            setPage(1);
            setSelectedEmailId(null);
          }}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "matched"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Inbox className="h-4 w-4" />
          {t("tabs.matched")}
        </button>
        <button
          onClick={() => {
            setTab("unmatched");
            setPage(1);
            setSelectedEmailId(null);
          }}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "unmatched"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Archive className="h-4 w-4" />
          {t("tabs.unmatched")}
        </button>
      </div>

      {/* Split Layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
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
            showAssign={tab === "unmatched"}
            onSelect={setSelectedEmailId}
            onPageChange={setPage}
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
              onBack={() => setSelectedEmailId(null)}
            />
          ) : (
            <p className="text-muted-foreground">{t("selectEmail")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
