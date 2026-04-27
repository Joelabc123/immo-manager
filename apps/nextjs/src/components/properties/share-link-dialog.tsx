"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2, Copy, Check, Trash2, Lock, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@repo/shared/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ShareLinkDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPIRY_OPTIONS = ["1", "7", "14", "30"] as const;

export function ShareLinkDialog({
  propertyId,
  open,
  onOpenChange,
}: ShareLinkDialogProps) {
  const t = useTranslations("sharing");
  const utils = trpc.useUtils();

  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [password, setPassword] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links } = trpc.shareLinks.list.useQuery(
    { propertyId },
    { enabled: open },
  );

  const createMutation = trpc.shareLinks.create.useMutation({
    onSuccess: () => {
      utils.shareLinks.list.invalidate({ propertyId });
      setPassword("");
    },
  });

  const deleteMutation = trpc.shareLinks.delete.useMutation({
    onSuccess: () => {
      utils.shareLinks.list.invalidate({ propertyId });
    },
  });

  function handleCreate() {
    createMutation.mutate({
      propertyId,
      expiresInDays,
      ...(password ? { password } : {}),
    });
  }

  async function handleCopy(token: string, linkId: string) {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeLinks = links?.filter((l) => !l.isExpired) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            {t("shareProperty")}
          </DialogTitle>
        </DialogHeader>

        {/* Create form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("expiry")}</Label>
            <Select
              value={String(expiresInDays)}
              onValueChange={(v) => v && setExpiresInDays(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((days) => (
                  <SelectItem key={days} value={days}>
                    {t(`expiryDays.${days}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("password")}</Label>
            <PasswordInput
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {t("createLink")}
          </Button>
        </div>

        {/* Active links */}
        {activeLinks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("activeLinks")}</h4>
              {activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {link.hasPassword && (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="mr-1 h-3 w-3" />
                          {t("hasPassword")}
                        </Badge>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {t("expiresAt")}: {formatDate(new Date(link.expiresAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(link.token, link.id)}
                    >
                      {copiedId === link.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: link.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeLinks.length === 0 && links && (
          <>
            <Separator />
            <p className="text-center text-sm text-muted-foreground">
              {t("noLinks")}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
