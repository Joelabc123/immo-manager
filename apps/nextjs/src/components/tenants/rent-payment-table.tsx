"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { PAYMENT_STATUS } from "@repo/shared/types";
import { formatDate } from "@repo/shared/utils";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  partial:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

interface RentPaymentTableProps {
  tenantId: string;
}

export function RentPaymentTable({ tenantId }: RentPaymentTableProps) {
  const t = useTranslations("rentPayments");
  const { formatCurrency } = useCurrency();
  const utils = trpc.useUtils();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentStatus, setPaymentStatus] = useState<string>(
    PAYMENT_STATUS.paid,
  );

  const { data } = trpc.rentPayments.list.useQuery({
    tenantId,
    pageSize: 50,
  });

  const recordMutation = trpc.rentPayments.record.useMutation({
    onSuccess: () => {
      utils.rentPayments.list.invalidate();
      utils.rentPayments.getSummary.invalidate();
      setRecordDialogOpen(false);
      setSelectedPaymentId(null);
    },
  });

  const openRecordDialog = (paymentId: string, expectedAmount: number) => {
    setSelectedPaymentId(paymentId);
    setPaidAmount((expectedAmount / 100).toFixed(2));
    setPaidDate(new Date().toISOString().split("T")[0]);
    setPaymentStatus(PAYMENT_STATUS.paid);
    setRecordDialogOpen(true);
  };

  const handleRecord = () => {
    if (!selectedPaymentId) return;
    recordMutation.mutate({
      id: selectedPaymentId,
      paidAmount: Math.round(parseFloat(paidAmount) * 100),
      paidDate,
      status: paymentStatus,
    });
  };

  if (!data || data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noPayments")}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">{t("dueDate")}</th>
              <th className="pb-2 pr-4">{t("expectedAmount")}</th>
              <th className="pb-2 pr-4">{t("paidAmount")}</th>
              <th className="pb-2 pr-4">{t("status")}</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((payment) => (
              <tr key={payment.id} className="border-b">
                <td className="py-2 pr-4">{formatDate(payment.dueDate)}</td>
                <td className="py-2 pr-4">
                  {formatCurrency(payment.expectedAmount)}
                </td>
                <td className="py-2 pr-4">
                  {payment.paidAmount !== null
                    ? formatCurrency(payment.paidAmount)
                    : "-"}
                </td>
                <td className="py-2 pr-4">
                  <Badge className={STATUS_COLORS[payment.status] ?? ""}>
                    {t(`statuses.${payment.status}`)}
                  </Badge>
                </td>
                <td className="py-2">
                  {payment.status !== PAYMENT_STATUS.paid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openRecordDialog(payment.id, payment.expectedAmount)
                      }
                    >
                      {t("recordPayment")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("recordPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("paidAmount")} (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("paidDate")}</Label>
              <Input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("status")}</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) => {
                  if (v !== null) setPaymentStatus(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PAYMENT_STATUS).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecordDialogOpen(false)}
            >
              {t("../common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleRecord} disabled={recordMutation.isPending}>
              {recordMutation.isPending ? t("recording") : t("recordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
