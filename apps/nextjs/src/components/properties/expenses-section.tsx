"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@/lib/zod-resolver";
import { createExpenseInput } from "@repo/shared/validation";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { EXPENSE_CATEGORIES, RECURRING_INTERVALS } from "@repo/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

interface ExpensesSectionProps {
  propertyId: string;
}

export function ExpensesSection({ propertyId }: ExpensesSectionProps) {
  const t = useTranslations("expenses");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const { data } = trpc.expenses.list.useQuery({ propertyId, pageSize: 100 });
  const { data: summary } = trpc.expenses.getSummary.useQuery({ propertyId });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.expenses.getSummary.invalidate();
    },
  });

  const form = useForm({
    resolver: zodResolver(createExpenseInput),
    defaultValues: {
      propertyId,
      category: "",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      interval: "monthly" as string,
      isApportionable: false,
    },
  });

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.expenses.getSummary.invalidate();
      setAddOpen(false);
      form.reset();
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate({
      ...data,
      amount: Math.round(data.amount * 100),
    });
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("addExpense")}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        {summary && (
          <div className="flex gap-4 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                {t("apportionable")}:
              </span>{" "}
              <span className="font-medium">
                {formatCurrency(summary.apportionable.total)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("nonApportionable")}:
              </span>{" "}
              <span className="font-medium">
                {formatCurrency(summary.nonApportionable.total)}
              </span>
            </div>
          </div>
        )}

        {!data || data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noExpenses")}</p>
        ) : (
          <div className="space-y-2">
            {data.items.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{expense.description}</p>
                    <Badge variant="outline">
                      {t(`categories.${expense.category}`)}
                    </Badge>
                    {expense.isApportionable && (
                      <Badge variant="secondary">{t("apportionable")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(expense.date)} &middot;{" "}
                    {expense.recurringInterval &&
                      t(`intervals.${expense.recurringInterval}`)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatCurrency(expense.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: expense.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addExpense")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>{t("description")}</Label>
              <Input {...form.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("amount")} (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("amount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("date")}</Label>
                <Input type="date" {...form.register("date")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("category")}</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(v) => {
                    if (v !== null) form.setValue("category", v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EXPENSE_CATEGORIES).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`categories.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("interval")}</Label>
                <Select
                  value={form.watch("interval")}
                  onValueChange={(v) => {
                    if (v !== null) form.setValue("interval", v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(RECURRING_INTERVALS).map((int) => (
                      <SelectItem key={int} value={int}>
                        {t(`intervals.${int}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isApportionable"
                checked={form.watch("isApportionable")}
                onCheckedChange={(checked: boolean) =>
                  form.setValue("isApportionable", !!checked)
                }
              />
              <Label htmlFor="isApportionable">{t("apportionable")}</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t("addExpense")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
