"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/components/user-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Upload, Trash2, UserCircle } from "lucide-react";

export function ProfileSection() {
  const t = useTranslations("settings.profile");
  const utils = trpc.useUtils();
  const { refetch: refetchUser } = useUser();

  const { data: profile, isLoading } = trpc.userSettings.getProfile.useQuery();

  const updateMutation = trpc.userSettings.updateProfile.useMutation({
    onSuccess: () => {
      void utils.userSettings.getProfile.invalidate();
      void utils.auth.me.invalidate();
      void refetchUser();
    },
  });

  const deleteAvatarMutation = trpc.userSettings.deleteAvatar.useMutation({
    onSuccess: () => {
      void utils.userSettings.getProfile.invalidate();
      void utils.auth.me.invalidate();
      void refetchUser();
    },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!initialized) {
    setName(profile.name);
    setEmail(profile.email);
    setEmailSignature(profile.emailSignature ?? "");
    setInitialized(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      email,
      emailSignature: emailSignature || null,
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadType", "avatar");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        void utils.userSettings.getProfile.invalidate();
        void utils.auth.me.invalidate();
        void refetchUser();
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = () => {
    deleteAvatarMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {profile.avatarUrl ? (
                <img
                  src={`/api/uploads/${profile.avatarUrl}`}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-4 w-4" />
                )}
                {t("uploadAvatar")}
              </Button>
              {profile.avatarUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  disabled={deleteAvatarMutation.isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {t("removeAvatar")}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">{t("name")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">{t("email")}</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-signature">{t("emailSignature")}</Label>
            <Input
              id="profile-signature"
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="self-start"
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
