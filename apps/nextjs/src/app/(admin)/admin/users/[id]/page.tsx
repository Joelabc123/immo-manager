"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Monitor,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("admin");
  const { user: currentUser } = useUser();
  const utils = trpc.useUtils();

  const isSelf = currentUser?.id === id;

  // Queries
  const { data: user, isLoading } = trpc.admin.getUser.useQuery({ userId: id });

  const { data: userSessions, isLoading: sessionsLoading } =
    trpc.admin.listUserSessions.useQuery({ userId: id });

  // Edit state
  const [editName, setEditName] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);

  // Mutations
  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      utils.admin.getUser.invalidate({ userId: id });
      utils.admin.listUsers.invalidate();
      setEditName(null);
      setEditEmail(null);
    },
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      utils.admin.getUser.invalidate({ userId: id });
      utils.admin.listUsers.invalidate();
    },
  });

  const banUser = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      utils.admin.getUser.invalidate({ userId: id });
      utils.admin.listUsers.invalidate();
      utils.admin.listUserSessions.invalidate({ userId: id });
      setBanDialogOpen(false);
    },
  });

  const revokeSession = trpc.admin.revokeUserSession.useMutation({
    onSuccess: () => {
      utils.admin.listUserSessions.invalidate({ userId: id });
      utils.admin.getUser.invalidate({ userId: id });
    },
  });

  const revokeAllSessions = trpc.admin.revokeAllUserSessions.useMutation({
    onSuccess: () => {
      utils.admin.listUserSessions.invalidate({ userId: id });
      utils.admin.getUser.invalidate({ userId: id });
      setRevokeAllDialogOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t("users.notFound")}</p>
      </div>
    );
  }

  const isEditing = editName !== null || editEmail !== null;
  const currentName = editName ?? user.name;
  const currentEmail = editEmail ?? user.email;

  const handleSaveProfile = () => {
    const updates: { userId: string; name?: string; email?: string } = {
      userId: id,
    };
    if (editName !== null && editName !== user.name) updates.name = editName;
    if (editEmail !== null && editEmail !== user.email)
      updates.email = editEmail;

    if (updates.name || updates.email) {
      updateUser.mutate(updates);
    } else {
      setEditName(null);
      setEditEmail(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/users")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role === "admin"
                ? t("users.roles.admin")
                : t("users.roles.member")}
            </Badge>
            {user.banned && (
              <Badge variant="destructive">{t("users.banned")}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("users.detail.profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("users.columns.name")}</Label>
              <Input
                id="name"
                value={currentName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("users.columns.email")}</Label>
              <Input
                id="email"
                type="email"
                value={currentEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("users.detail.language")}
                </span>
                <p>{user.language}</p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("users.detail.currency")}
                </span>
                <p>{user.currency}</p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("users.detail.properties")}
                </span>
                <p>{user.propertyCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("users.detail.sessions")}
                </span>
                <p>{user.sessionCount}</p>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t("users.detail.save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditName(null);
                    setEditEmail(null);
                  }}
                >
                  {t("users.detail.cancel")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role & Ban Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("users.detail.roleManagement")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("users.columns.role")}</Label>
                <Select
                  value={user.role}
                  onValueChange={(value) =>
                    updateRole.mutate({
                      userId: id,
                      role: value as "member" | "admin",
                    })
                  }
                  disabled={isSelf || updateRole.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      {t("users.roles.member")}
                    </SelectItem>
                    <SelectItem value="admin">
                      {t("users.roles.admin")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isSelf && (
                  <p className="text-xs text-muted-foreground">
                    {t("users.detail.cannotChangeOwnRole")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("users.detail.accountStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {user.banned
                      ? t("users.detail.accountBanned")
                      : t("users.detail.accountActive")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.banned
                      ? t("users.detail.bannedDescription")
                      : t("users.detail.activeDescription")}
                  </p>
                </div>
                {!isSelf && user.role !== "admin" && (
                  <Button
                    variant={user.banned ? "outline" : "destructive"}
                    size="sm"
                    onClick={() => setBanDialogOpen(true)}
                  >
                    {user.banned ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t("users.detail.unban")}
                      </>
                    ) : (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        {t("users.detail.ban")}
                      </>
                    )}
                  </Button>
                )}
                {user.role === "admin" && !isSelf && (
                  <p className="text-xs text-muted-foreground">
                    {t("users.detail.cannotBanAdmin")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sessions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("users.detail.activeSessions")}</CardTitle>
          {userSessions && userSessions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRevokeAllDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("users.detail.revokeAll")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !userSessions || userSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("users.detail.noSessions")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.detail.device")}</TableHead>
                  <TableHead>{t("users.detail.ipAddress")}</TableHead>
                  <TableHead>{t("users.detail.lastActive")}</TableHead>
                  <TableHead>{t("users.detail.createdAt")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="max-w-[300px] truncate text-sm">
                        {session.userAgent ?? t("users.detail.unknownDevice")}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.ipAddress ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.lastActiveAt
                        ? new Date(session.lastActiveAt).toLocaleString("de-DE")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleString("de-DE")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          revokeSession.mutate({ sessionId: session.id })
                        }
                        disabled={revokeSession.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ban Confirmation Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user.banned
                ? t("users.detail.unbanTitle")
                : t("users.detail.banTitle")}
            </DialogTitle>
            <DialogDescription>
              {user.banned
                ? t("users.detail.unbanConfirm", { name: user.name })
                : t("users.detail.banConfirm", { name: user.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanDialogOpen(false)}>
              {t("users.detail.cancel")}
            </Button>
            <Button
              variant={user.banned ? "default" : "destructive"}
              onClick={() =>
                banUser.mutate({ userId: id, banned: !user.banned })
              }
              disabled={banUser.isPending}
            >
              {banUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {user.banned ? t("users.detail.unban") : t("users.detail.ban")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.detail.revokeAllTitle")}</DialogTitle>
            <DialogDescription>
              {t("users.detail.revokeAllConfirm", { name: user.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRevokeAllDialogOpen(false)}
            >
              {t("users.detail.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeAllSessions.mutate({ userId: id })}
              disabled={revokeAllSessions.isPending}
            >
              {revokeAllSessions.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("users.detail.revokeAll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
