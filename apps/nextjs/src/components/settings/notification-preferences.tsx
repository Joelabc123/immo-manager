"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function NotificationPreferences() {
  const t = useTranslations("settings.notifications");
  const utils = trpc.useUtils();

  const { data: prefs, isLoading } = trpc.email.getPreferences.useQuery();

  const updateMutation = trpc.email.updatePreferences.useMutation({
    onSuccess: () => void utils.email.getPreferences.invalidate(),
  });

  if (isLoading || !prefs) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-64" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const toggle = (field: string, value: boolean) => {
    updateMutation.mutate({ [field]: value });
  };

  const items = [
    {
      key: "notifyNewEmail",
      label: t("newEmail"),
      checked: prefs.notifyNewEmail,
    },
    {
      key: "notifyOverdueRent",
      label: t("overdueRent"),
      checked: prefs.notifyOverdueRent,
    },
    {
      key: "notifyContractExpiry",
      label: t("contractExpiry"),
      checked: prefs.notifyContractExpiry,
    },
    { key: "pushEnabled", label: t("pushEnabled"), checked: prefs.pushEnabled },
    {
      key: "trackingPixelEnabled",
      label: t("trackingPixel"),
      checked: prefs.trackingPixelEnabled,
    },
  ] as const;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-3">
            <Checkbox
              checked={item.checked}
              onCheckedChange={(checked) => toggle(item.key, checked === true)}
              disabled={updateMutation.isPending}
            />
            <Label className="cursor-pointer">{item.label}</Label>
          </div>
        ))}

        {prefs.pushEnabled && <PushSubscriptionButton />}
      </CardContent>
    </Card>
  );
}

function PushSubscriptionButton() {
  const t = useTranslations("settings.notifications");

  const subscribeMutation = trpc.notifications.subscribePush.useMutation();
  const unsubscribeMutation = trpc.notifications.unsubscribePush.useMutation();

  const handleSubscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    const json = subscription.toJSON();
    subscribeMutation.mutate({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      },
    });
  };

  const handleUnsubscribe = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      unsubscribeMutation.mutate({ endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
  };

  return (
    <div className="flex gap-2 pl-7">
      <Button
        size="sm"
        variant="outline"
        onClick={handleSubscribe}
        disabled={subscribeMutation.isPending}
      >
        {subscribeMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {t("enablePush")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleUnsubscribe}
        disabled={unsubscribeMutation.isPending}
      >
        {t("disablePush")}
      </Button>
    </div>
  );
}
