"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Mail,
  ClipboardList,
  Shield,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/lib/websocket";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/properties", icon: Building2, labelKey: "properties" as const },
  { href: "/tenants", icon: Users, labelKey: "tenants" as const },
  { href: "/analysis", icon: BarChart3, labelKey: "analysis" as const },
  { href: "/mail", icon: Mail, labelKey: "mail" as const },
  { href: "/documents", icon: FileText, labelKey: "documents" as const },
  { href: "/audit", icon: ClipboardList, labelKey: "audit" as const },
  { href: "/settings", icon: Settings, labelKey: "settings" as const },
  {
    href: "/admin/users",
    icon: Shield,
    labelKey: "admin" as const,
    adminOnly: true,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();
  const { user } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Establish WebSocket connection for real-time updates
  useWebSocket();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    await utils.invalidate();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {sidebarCollapsed ? (
            <Link href="/" className="mx-auto">
              <Building2 className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Building2 className="h-5 w-5 shrink-0" />
                <span className="truncate">Immo Manager</span>
              </Link>
              <NotificationBell />
            </>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <TooltipProvider>
            {visibleNavItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    sidebarCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && t(item.labelKey)}
                </Link>
              );
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={<div />}>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t(item.labelKey)}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return linkContent;
            })}
          </TooltipProvider>
        </nav>
        <div className="border-t p-3">
          {user && !sidebarCollapsed && (
            <div className="mb-2 flex items-center gap-3 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                {user.avatarUrl ? (
                  <img
                    src={`/api/uploads/${user.avatarUrl}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="truncate text-sm font-medium">{user.name}</span>
            </div>
          )}
          {user && sidebarCollapsed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<div />}>
                  <div className="mb-2 flex justify-center px-2 py-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {user.avatarUrl ? (
                        <img
                          src={`/api/uploads/${user.avatarUrl}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{user.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<div />}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full gap-3 text-muted-foreground",
                    sidebarCollapsed ? "justify-center px-2" : "justify-start",
                  )}
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && t("logout" as "dashboard")}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">
                  {t("logout" as "dashboard")}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            className={cn(
              "mt-2 w-full gap-3 text-muted-foreground",
              sidebarCollapsed ? "justify-center px-2" : "justify-start",
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 pb-20 md:p-6 md:pb-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {visibleNavItems.slice(0, 4).map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground",
              visibleNavItems
                .slice(4)
                .some((item) =>
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href),
                ) && "text-primary",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            {t("more" as "dashboard")}
          </SheetTrigger>
          <SheetContent side="bottom" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>{t("more" as "dashboard")}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 pb-4">
              {visibleNavItems.slice(4).map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="mt-2 justify-start gap-3 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                {t("logout" as "dashboard")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
