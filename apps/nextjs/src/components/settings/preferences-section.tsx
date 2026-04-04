"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/components/user-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const CURRENCIES = [
  { value: "EUR", label: "EUR (Euro)" },
  { value: "USD", label: "USD (US Dollar)" },
  { value: "CHF", label: "CHF (Swiss Franc)" },
] as const;

const LANGUAGES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
] as const;

const KPI_PERIODS = [
  { value: "current_month", labelKey: "currentMonth" },
  { value: "last_month", labelKey: "lastMonth" },
  { value: "current_year", labelKey: "currentYear" },
  { value: "last_year", labelKey: "lastYear" },
] as const;

export function PreferencesSection() {
  const t = useTranslations("settings.preferences");
  const utils = trpc.useUtils();
  const { refetch: refetchUser } = useUser();

  const { data: prefs, isLoading } =
    trpc.userSettings.getPreferences.useQuery();

  const updateMutation = trpc.userSettings.updatePreferences.useMutation({
    onSuccess: () => {
      void utils.userSettings.getPreferences.invalidate();
      void utils.auth.me.invalidate();
      void refetchUser();
    },
  });

  const [initialized, setInitialized] = useState(false);
  const [form, setForm] = useState({
    currency: "EUR",
    language: "de",
    taxRate: null as number | null,
    retirementYear: null as number | null,
    healthScoreCashflowWeight: 34,
    healthScoreLtvWeight: 33,
    healthScoreYieldWeight: 33,
    kpiPeriod: "current_month",
    dscrTarget: 120,
    donutThreshold: 5,
    brokerFeeDefault: 357,
    shareLinkValidityDays: 7,
    annualAppreciationDefault: 200,
    capitalGainsTax: 2500,
    pushEnabled: false,
    notifyNewEmail: true,
    notifyOverdueRent: true,
    notifyContractExpiry: true,
    trackingPixelEnabled: false,
  });

  if (isLoading || !prefs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!initialized) {
    setForm({
      currency: prefs.currency,
      language: prefs.language,
      taxRate: prefs.taxRate,
      retirementYear: prefs.retirementYear,
      healthScoreCashflowWeight: prefs.healthScoreCashflowWeight,
      healthScoreLtvWeight: prefs.healthScoreLtvWeight,
      healthScoreYieldWeight: prefs.healthScoreYieldWeight,
      kpiPeriod: prefs.kpiPeriod,
      dscrTarget: prefs.dscrTarget,
      donutThreshold: prefs.donutThreshold,
      brokerFeeDefault: prefs.brokerFeeDefault,
      shareLinkValidityDays: prefs.shareLinkValidityDays,
      annualAppreciationDefault: prefs.annualAppreciationDefault,
      capitalGainsTax: prefs.capitalGainsTax,
      pushEnabled: prefs.pushEnabled,
      notifyNewEmail: prefs.notifyNewEmail,
      notifyOverdueRent: prefs.notifyOverdueRent,
      notifyContractExpiry: prefs.notifyContractExpiry,
      trackingPixelEnabled: prefs.trackingPixelEnabled,
    });
    setInitialized(true);
  }

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const languageChanged = form.language !== prefs.language;

    updateMutation.mutate(
      {
        ...form,
        currency: form.currency as "EUR" | "USD" | "CHF",
        language: form.language as "de" | "en",
        kpiPeriod: form.kpiPeriod as
          | "current_month"
          | "last_month"
          | "current_year"
          | "last_year",
      },
      {
        onSuccess: () => {
          if (languageChanged) {
            document.cookie = `locale=${form.language};path=/;max-age=31536000`;
            window.location.reload();
          }
        },
      },
    );
  };

  const healthScoreTotal =
    form.healthScoreCashflowWeight +
    form.healthScoreLtvWeight +
    form.healthScoreYieldWeight;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => v && updateField("currency", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("language")}</Label>
              <Select
                value={form.language}
                onValueChange={(v) => v && updateField("language", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-rate">{t("taxRate")}</Label>
              <Input
                id="tax-rate"
                type="number"
                value={form.taxRate != null ? form.taxRate / 100 : ""}
                onChange={(e) =>
                  updateField(
                    "taxRate",
                    e.target.value
                      ? Math.round(Number(e.target.value) * 100)
                      : null,
                  )
                }
                step="0.01"
                min="0"
                max="100"
                placeholder="42.0"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retirement-year">{t("retirementYear")}</Label>
              <Input
                id="retirement-year"
                type="number"
                value={form.retirementYear ?? ""}
                onChange={(e) =>
                  updateField(
                    "retirementYear",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                min="2024"
                max="2100"
                placeholder="2050"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("healthScoreWeights")}</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("cashflowWeight")}
                </span>
                <Input
                  type="number"
                  value={form.healthScoreCashflowWeight}
                  onChange={(e) =>
                    updateField(
                      "healthScoreCashflowWeight",
                      Number(e.target.value),
                    )
                  }
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("ltvWeight")}
                </span>
                <Input
                  type="number"
                  value={form.healthScoreLtvWeight}
                  onChange={(e) =>
                    updateField("healthScoreLtvWeight", Number(e.target.value))
                  }
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("yieldWeight")}
                </span>
                <Input
                  type="number"
                  value={form.healthScoreYieldWeight}
                  onChange={(e) =>
                    updateField(
                      "healthScoreYieldWeight",
                      Number(e.target.value),
                    )
                  }
                  min="0"
                  max="100"
                />
              </div>
            </div>
            {healthScoreTotal !== 100 && (
              <p className="text-xs text-destructive">
                {t("weightsMustEqual100", { total: healthScoreTotal })}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("kpiPeriod")}</Label>
              <Select
                value={form.kpiPeriod}
                onValueChange={(v) => v && updateField("kpiPeriod", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KPI_PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t(p.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dscr-target">{t("dscrTarget")}</Label>
              <Input
                id="dscr-target"
                type="number"
                value={form.dscrTarget / 100}
                onChange={(e) =>
                  updateField(
                    "dscrTarget",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
                step="0.01"
                min="0.5"
                max="5"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broker-fee">{t("brokerFee")}</Label>
              <Input
                id="broker-fee"
                type="number"
                value={form.brokerFeeDefault / 100}
                onChange={(e) =>
                  updateField(
                    "brokerFeeDefault",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
                step="0.01"
                min="0"
                max="100"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appreciation">{t("annualAppreciation")}</Label>
              <Input
                id="appreciation"
                type="number"
                value={form.annualAppreciationDefault / 100}
                onChange={(e) =>
                  updateField(
                    "annualAppreciationDefault",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
                step="0.01"
                min="0"
                max="50"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capital-gains">{t("capitalGainsTax")}</Label>
              <Input
                id="capital-gains"
                type="number"
                value={form.capitalGainsTax / 100}
                onChange={(e) =>
                  updateField(
                    "capitalGainsTax",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
                step="0.01"
                min="0"
                max="100"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="donut-threshold">{t("donutThreshold")}</Label>
              <Input
                id="donut-threshold"
                type="number"
                value={form.donutThreshold}
                onChange={(e) =>
                  updateField("donutThreshold", Number(e.target.value))
                }
                min="1"
                max="50"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="share-validity">{t("shareLinkValidity")}</Label>
              <Input
                id="share-validity"
                type="number"
                value={form.shareLinkValidityDays}
                onChange={(e) =>
                  updateField("shareLinkValidityDays", Number(e.target.value))
                }
                min="1"
                max="365"
              />
              <span className="text-xs text-muted-foreground">{t("days")}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={updateMutation.isPending || healthScoreTotal !== 100}
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
