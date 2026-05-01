"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ExternalLink, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CLAIM_SOURCES,
  CLAIM_TYPES,
  DUNNING_DOCUMENT_TYPES,
  DUNNING_LEVELS,
  type DunningDocumentType,
  type DunningLevel,
} from "@repo/shared/types";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const DOCUMENT_TYPE_OPTIONS = Object.values(DUNNING_DOCUMENT_TYPES);

function getDefaultPaymentDeadline(): string {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);
  return deadline.toISOString().split("T")[0];
}

const LEVEL_COLORS: Record<string, string> = {
  reminder: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  first:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  second:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  third: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface DunningSectionProps {
  tenantId: string;
  overdueAmount?: number;
}

interface DunningListRecord {
  id: string;
  level: string;
  amount: number;
  feeAmount: number;
  totalAmount: number | null;
  documentType: string;
  status: string;
  dunningDate: string;
}

interface ClaimSuggestion {
  paymentId: string;
  propertyId: string | null;
  rentalUnitId: string | null;
  description: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
  source: typeof CLAIM_SOURCES.rent_payment;
}

export function DunningSection({
  tenantId,
  overdueAmount = 0,
}: DunningSectionProps) {
  const t = useTranslations("dunning");
  const tCommon = useTranslations("common");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DunningDocumentType>(
    DUNNING_DOCUMENT_TYPES.rent,
  );
  const [level, setLevel] = useState<DunningLevel>(DUNNING_LEVELS.reminder);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    [],
  );
  const [amount, setAmount] = useState((overdueAmount / 100).toFixed(2));
  const [dunningDate, setDunningDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentDeadline, setPaymentDeadline] = useState(
    getDefaultPaymentDeadline,
  );

  const { data: records } = trpc.dunning.list.useQuery({ tenantId });
  const { data: suggestions } = trpc.dunning.listClaimSuggestions.useQuery(
    { tenantId },
    { enabled: dialogOpen },
  );

  const createClaimMutation = trpc.dunning.createClaim.useMutation();
  const createDraftMutation = trpc.dunning.createDraft.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.dunning.list.invalidate({ tenantId }),
        utils.dunning.listClaims.invalidate({ tenantId }),
      ]);
      setSelectedSuggestionIds([]);
      setDialogOpen(false);
    },
  });

  const selectedSuggestions = (
    (suggestions?.suggestions ?? []) as ClaimSuggestion[]
  ).filter((suggestion: ClaimSuggestion) =>
    selectedSuggestionIds.includes(suggestion.paymentId),
  );

  const recordsList = (records ?? []) as DunningListRecord[];
  const claimSuggestions = (suggestions?.suggestions ??
    []) as ClaimSuggestion[];

  const setSelection = (paymentId: string, checked: boolean) => {
    const next = checked
      ? [...selectedSuggestionIds, paymentId]
      : selectedSuggestionIds.filter((id) => id !== paymentId);
    setSelectedSuggestionIds(next);

    const nextAmount =
      claimSuggestions
        .filter((suggestion: ClaimSuggestion) =>
          next.includes(suggestion.paymentId),
        )
        .reduce(
          (sum: number, suggestion: ClaimSuggestion) =>
            sum + suggestion.remainingAmount,
          0,
        ) ?? 0;
    if (nextAmount > 0) {
      setAmount((nextAmount / 100).toFixed(2));
    }
  };

  const handleCreate = async () => {
    const createdClaims: Array<{ id: string }> = [];

    for (const suggestion of selectedSuggestions) {
      const claim = await createClaimMutation.mutateAsync({
        tenantId,
        propertyId: suggestion.propertyId,
        rentalUnitId: suggestion.rentalUnitId,
        type: CLAIM_TYPES.operating_cost_advance,
        description: suggestion.description,
        amount: suggestion.amount,
        remainingAmount: suggestion.remainingAmount,
        dueDate: suggestion.dueDate,
        source: suggestion.source,
        metadata: { paymentId: suggestion.paymentId },
      });
      createdClaims.push(claim);
    }

    await createDraftMutation.mutateAsync({
      tenantId,
      documentType,
      level,
      amount: Math.round(parseFloat(amount) * 100),
      feeAmount: 0,
      dunningDate,
      paymentDeadline,
      claimIds: createdClaims.map((claim) => claim.id),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          {t("createDunning")}
        </Button>
      </CardHeader>
      <CardContent>
        {recordsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noDunning")}</p>
        ) : (
          <div className="space-y-2">
            {recordsList.map((record: DunningListRecord) => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={LEVEL_COLORS[record.level] ?? ""}>
                      {t(`levels.${record.level}`)}
                    </Badge>
                    <Badge variant="outline">
                      {t(`documentTypes.${record.documentType}`)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatDate(record.dunningDate)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`statuses.${record.status}`)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium">
                    {formatCurrency(record.totalAmount ?? record.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/tenants/${tenantId}/dunning/${record.id}`}
                      />
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">{t("open")}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("createDunning")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {suggestions?.terminationWarning.shouldWarn && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {t("criticalWarning")}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("documentType")}</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) =>
                    value && setDocumentType(value as DunningDocumentType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => t(`documentTypes.${value}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className="w-72 max-w-[calc(100vw-2rem)]"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        label={t(`documentTypes.${type}`)}
                      >
                        {t(`documentTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("level")}</Label>
                <Select
                  value={level}
                  onValueChange={(value) =>
                    value && setLevel(value as DunningLevel)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => t(`levels.${value}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-48 max-w-[calc(100vw-2rem)]">
                    {LEVEL_OPTIONS.map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        label={t(`levels.${option}`)}
                      >
                        {t(`levels.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("claimSuggestions")}</Label>
              {claimSuggestions.length === 0 ? (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  {t("noClaimSuggestions")}
                </p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
                  {claimSuggestions.map((suggestion: ClaimSuggestion) => (
                    <label
                      key={suggestion.paymentId}
                      className="flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedSuggestionIds.includes(
                          suggestion.paymentId,
                        )}
                        onCheckedChange={(checked: boolean) =>
                          setSelection(suggestion.paymentId, checked)
                        }
                      />
                      <span className="flex-1">{suggestion.description}</span>
                      <span className="font-medium">
                        {formatCurrency(suggestion.remainingAmount)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t("amount")} (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("dunningDate")}</Label>
                <Input
                  type="date"
                  value={dunningDate}
                  onChange={(event) => setDunningDate(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("paymentDeadline")}</Label>
                <Input
                  type="date"
                  value={paymentDeadline}
                  onChange={(event) => setPaymentDeadline(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={
                createDraftMutation.isPending || createClaimMutation.isPending
              }
            >
              {createDraftMutation.isPending || createClaimMutation.isPending
                ? t("creating")
                : t("createDunning")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
