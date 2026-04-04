"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@/lib/zod-resolver";
import { createLoanInput } from "@repo/shared/validation";
import { formatPercentage } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
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
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LoansSectionProps {
  propertyId: string;
}

export function LoansSection({ propertyId }: LoansSectionProps) {
  const t = useTranslations("loans");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState<string | null>(null);

  const { data: loans } = trpc.loans.list.useQuery({ propertyId });

  const deleteMutation = trpc.loans.delete.useMutation({
    onSuccess: () => utils.loans.list.invalidate(),
  });

  const form = useForm({
    resolver: zodResolver(createLoanInput),
    defaultValues: {
      propertyId,
      bankName: "",
      loanAmount: 0,
      remainingBalance: 0,
      interestRate: 0,
      repaymentRate: 0,
      monthlyPayment: 0,
      loanStart: new Date().toISOString().split("T")[0],
      loanTermMonths: undefined as number | undefined,
    },
  });

  const createMutation = trpc.loans.create.useMutation({
    onSuccess: () => {
      utils.loans.list.invalidate();
      setAddOpen(false);
      form.reset();
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate({
      ...data,
      loanAmount: Math.round(data.loanAmount * 100),
      remainingBalance: Math.round(data.remainingBalance * 100),
      interestRate: Math.round(data.interestRate * 100),
      repaymentRate: Math.round(data.repaymentRate * 100),
      monthlyPayment: Math.round(data.monthlyPayment * 100),
    });
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("addLoan")}
        </Button>
      </CardHeader>
      <CardContent>
        {!loans || loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noLoans")}</p>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div key={loan.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loan.bankName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(loan.loanAmount)} &middot;{" "}
                      {formatPercentage(loan.interestRate)} &middot;{" "}
                      {formatCurrency(loan.monthlyPayment)}/mo
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setScheduleOpen(
                          scheduleOpen === loan.id ? null : loan.id,
                        )
                      }
                    >
                      {scheduleOpen === loan.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {t("amortization.title")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: loan.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {scheduleOpen === loan.id && (
                  <AmortizationSchedule loanId={loan.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Loan Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addLoan")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>{t("bankName")}</Label>
              <Input {...form.register("bankName")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("loanAmount")} (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("loanAmount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("remainingBalance")} (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("remainingBalance", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("interestRate")} (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("interestRate", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("repaymentRate")} (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("repaymentRate", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("monthlyPayment")} (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("monthlyPayment", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("loanStart")}</Label>
                <Input type="date" {...form.register("loanStart")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                {t("loanTermMonths")} ({t("optional")})
              </Label>
              <Input
                type="number"
                {...form.register("loanTermMonths", { valueAsNumber: true })}
              />
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
                {t("addLoan")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AmortizationSchedule({ loanId }: { loanId: string }) {
  const t = useTranslations("loans.amortization");
  const { formatCurrency } = useCurrency();
  const { data, isLoading } = trpc.loans.getAmortizationSchedule.useQuery({
    id: loanId,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">...</p>;
  if (!data) return null;

  return (
    <Collapsible defaultOpen>
      <CollapsibleContent>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("year")}</TableHead>
                <TableHead>{t("totalPayments")}</TableHead>
                <TableHead>{t("totalInterest")}</TableHead>
                <TableHead>{t("totalPrincipal")}</TableHead>
                <TableHead>{t("remainingBalance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.yearlySummary.map((year) => (
                <TableRow key={year.year}>
                  <TableCell>{year.year}</TableCell>
                  <TableCell>{formatCurrency(year.totalPayments)}</TableCell>
                  <TableCell>{formatCurrency(year.totalInterest)}</TableCell>
                  <TableCell>{formatCurrency(year.totalPrincipal)}</TableCell>
                  <TableCell>{formatCurrency(year.remainingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
