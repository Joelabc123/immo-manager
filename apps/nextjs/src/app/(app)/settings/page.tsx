"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { PasswordSection } from "@/components/settings/password-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import { EmailAccountForm } from "@/components/settings/email-account-form";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { MarketDataSection } from "@/components/settings/market-data-section";
import { DunningConfigSection } from "@/components/settings/dunning-config-section";

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("tabs.profile")}</TabsTrigger>
          <TabsTrigger value="preferences">{t("tabs.preferences")}</TabsTrigger>
          <TabsTrigger value="email">{t("tabs.email")}</TabsTrigger>
          <TabsTrigger value="notifications">
            {t("tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger value="marketData">{t("tabs.marketData")}</TabsTrigger>
          <TabsTrigger value="dunning">{t("tabs.dunning")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="flex flex-col gap-6">
          <ProfileSection />
          <PasswordSection />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSection />
        </TabsContent>

        <TabsContent value="email">
          <EmailAccountForm />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="marketData">
          <MarketDataSection />
        </TabsContent>

        <TabsContent value="dunning">
          <DunningConfigSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
