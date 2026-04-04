"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@repo/shared/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);

  const { data: countData } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

  const { data, isLoading } = trpc.notifications.list.useQuery(
    { page: 1, limit: 20, unreadOnly: false },
    { enabled: open },
  );

  const utils = trpc.useUtils();
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });

  const unreadCount = countData?.count ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            className="relative rounded-md p-1.5 hover:bg-muted"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}
      />
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("title")}</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => markAllReadMutation.mutate()}
            >
              <Check className="mr-1 h-3 w-3" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : !data?.notifications?.length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            data.notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-2 border-b px-3 py-2.5 text-sm last:border-0",
                  !notif.isRead && "bg-primary/5",
                )}
              >
                <div className="flex-1">
                  <p className={cn("text-sm", !notif.isRead && "font-medium")}>
                    {notif.title}
                  </p>
                  {notif.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(new Date(notif.createdAt))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => markReadMutation.mutate({ id: notif.id })}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => deleteMutation.mutate({ id: notif.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
