"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DUNNING_LEVELS } from "@repo/shared/types";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function DunningSection({
  tenantId,
  overdueAmount = 0,
}: DunningSectionProps) {
  const t = useTranslations("dunning");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [level, setLevel] = useState<string>(DUNNING_LEVELS.reminder);
  const [amount, setAmount] = useState((overdueAmount / 100).toFixed(2));
  const [dunningDate, setDunningDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const { data: records } = trpc.dunning.list.useQuery({ tenantId });

  const createMutation = trpc.dunning.create.useMutation({
    onSuccess: () => {
      utils.dunning.list.invalidate();
      setDialogOpen(false);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          {t("createDunning")}
        </Button>
      </CardHeader>
      <CardContent>
        {!records || records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noDunning")}</p>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between text-sm border-b pb-2"
              >
                <div className="flex items-center gap-2">
                  <Badge className={LEVEL_COLORS[record.level] ?? ""}>
                    {t(`levels.${record.level}`)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatDate(record.dunningDate)}
                  </span>
                </div>
                <span className="font-medium">
                  {formatCurrency(record.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("createDunning")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("level")}</Label>
              <Select
                value={level}
                onValueChange={(v) => {
                  if (v !== null) setLevel(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DUNNING_LEVELS).map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`levels.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("amount")} (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("dunningDate")}</Label>
              <Input
                type="date"
                value={dunningDate}
                onChange={(e) => setDunningDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("../common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  tenantId,
                  level,
                  amount: Math.round(parseFloat(amount) * 100),
                  dunningDate,
                })
              }
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t("creating") : t("createDunning")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
