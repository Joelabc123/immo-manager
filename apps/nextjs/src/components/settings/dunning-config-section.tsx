"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DUNNING_DOCUMENT_TYPES,
  DUNNING_LEVELS,
  DUNNING_TEMPLATE_TONES,
  GERMAN_FEDERAL_STATES,
  type DunningDocumentType,
  type DunningLevel,
  type DunningTemplateTone,
  type GermanFederalState,
} from "@repo/shared/types";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEVEL_OPTIONS = [
  DUNNING_LEVELS.reminder,
  DUNNING_LEVELS.first,
  DUNNING_LEVELS.second,
] as const;

export function DunningConfigSection() {
  const t = useTranslations("settings.dunning");
  const tDunning = useTranslations("dunning");
  const utils = trpc.useUtils();
  const { data } = trpc.dunning.getSettings.useQuery();

  const [defaultFederalStateOverride, setDefaultFederalStateOverride] =
    useState<GermanFederalState | null>(null);
  const [latePaymentThresholdOverride, setLatePaymentThresholdOverride] =
    useState<number | null>(null);
  const [latePaymentWindowOverride, setLatePaymentWindowOverride] = useState<
    number | null
  >(null);
  const [automationEnabledOverride, setAutomationEnabledOverride] = useState<
    boolean | null
  >(null);

  const [documentType, setDocumentType] = useState<DunningDocumentType>(
    DUNNING_DOCUMENT_TYPES.rent,
  );
  const [level, setLevel] = useState<DunningLevel>(DUNNING_LEVELS.reminder);
  const [locale, setLocale] = useState<"de" | "en">("de");
  const [toneOverride, setToneOverride] = useState<DunningTemplateTone | null>(
    null,
  );

  const selectedTemplate = useMemo(() => {
    return data?.templates.find(
      (template) =>
        template.documentType === documentType &&
        template.level === level &&
        template.locale === locale,
    );
  }, [data?.templates, documentType, level, locale]);

  const defaultFederalState =
    defaultFederalStateOverride ??
    (data?.settings.defaultFederalState as GermanFederalState | undefined) ??
    GERMAN_FEDERAL_STATES.NW;
  const latePaymentThresholdCount =
    latePaymentThresholdOverride ??
    data?.settings.latePaymentThresholdCount ??
    2;
  const latePaymentWindowMonths =
    latePaymentWindowOverride ?? data?.settings.latePaymentWindowMonths ?? 12;
  const automationEnabled =
    automationEnabledOverride ?? data?.settings.automationEnabled ?? false;
  const tone =
    toneOverride ??
    (selectedTemplate?.tone as DunningTemplateTone | undefined) ??
    DUNNING_TEMPLATE_TONES.formal;

  const updateSettingsMutation = trpc.dunning.updateSettings.useMutation({
    onSuccess: () => utils.dunning.getSettings.invalidate(),
  });
  const upsertTemplateMutation = trpc.dunning.upsertTemplate.useMutation({
    onSuccess: () => utils.dunning.getSettings.invalidate(),
  });

  const handleSelectionChange = (next: {
    documentType?: DunningDocumentType;
    level?: DunningLevel;
    locale?: "de" | "en";
  }) => {
    if (next.documentType) setDocumentType(next.documentType);
    if (next.level) setLevel(next.level);
    if (next.locale) setLocale(next.locale);
    setToneOverride(null);
  };

  const handleTemplateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subjectTemplate = String(
      formData.get("subjectTemplate") ?? "",
    ).trim();
    const bodyTemplate = String(formData.get("bodyTemplate") ?? "").trim();
    if (!subjectTemplate || !bodyTemplate) return;

    upsertTemplateMutation.mutate({
      documentType,
      level,
      locale,
      tone,
      subjectTemplate,
      bodyTemplate,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("defaultFederalState")}</Label>
            <Select
              value={defaultFederalState}
              onValueChange={(value) =>
                value &&
                setDefaultFederalStateOverride(value as GermanFederalState)
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(value: string) => t(`federalStates.${value}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(GERMAN_FEDERAL_STATES).map((state) => (
                  <SelectItem
                    key={state}
                    value={state}
                    label={t(`federalStates.${state}`)}
                  >
                    {t(`federalStates.${state}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("latePaymentThresholdCount")}</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={latePaymentThresholdCount}
                onChange={(event) =>
                  setLatePaymentThresholdOverride(Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("latePaymentWindowMonths")}</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={latePaymentWindowMonths}
                onChange={(event) =>
                  setLatePaymentWindowOverride(Number(event.target.value))
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={automationEnabled}
              onCheckedChange={(checked: boolean) =>
                setAutomationEnabledOverride(checked)
              }
            />
            {t("automationEnabled")}
          </label>

          <Button
            onClick={() =>
              updateSettingsMutation.mutate({
                defaultFederalState,
                latePaymentThresholdCount,
                latePaymentWindowMonths,
                automationEnabled,
              })
            }
            disabled={updateSettingsMutation.isPending}
          >
            {t("saveSettings")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("templatesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            key={`${documentType}-${level}-${locale}-${selectedTemplate?.id ?? "new"}`}
            className="space-y-4"
            onSubmit={handleTemplateSubmit}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{tDunning("documentType")}</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) =>
                    value &&
                    handleSelectionChange({
                      documentType: value as DunningDocumentType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => tDunning(`documentTypes.${value}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DUNNING_DOCUMENT_TYPES).map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        label={tDunning(`documentTypes.${type}`)}
                      >
                        {tDunning(`documentTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tDunning("level")}</Label>
                <Select
                  value={level}
                  onValueChange={(value) =>
                    value &&
                    handleSelectionChange({ level: value as DunningLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => tDunning(`levels.${value}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        label={tDunning(`levels.${option}`)}
                      >
                        {tDunning(`levels.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("locale")}</Label>
                <Select
                  value={locale}
                  onValueChange={(value) =>
                    value &&
                    handleSelectionChange({ locale: value as "de" | "en" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => t(`locales.${value}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(["de", "en"] as const).map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        label={t(`locales.${option}`)}
                      >
                        {t(`locales.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("tone")}</Label>
                <Select
                  value={tone}
                  onValueChange={(value) =>
                    value && setToneOverride(value as DunningTemplateTone)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => t(`tones.${value}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DUNNING_TEMPLATE_TONES).map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        label={t(`tones.${option}`)}
                      >
                        {t(`tones.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("subjectTemplate")}</Label>
              <Input
                name="subjectTemplate"
                required
                defaultValue={selectedTemplate?.subjectTemplate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("bodyTemplate")}</Label>
              <Textarea
                name="bodyTemplate"
                required
                rows={10}
                defaultValue={selectedTemplate?.bodyTemplate ?? ""}
              />
            </div>

            <Button type="submit" disabled={upsertTemplateMutation.isPending}>
              {t("saveTemplate")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
