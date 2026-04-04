"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercentage } from "@repo/shared/utils";
import { RefreshCw, Plus, Trash2, Loader2 } from "lucide-react";
import { RentBenchmarkDialog } from "@/components/settings/rent-benchmark-dialog";

export function MarketDataSection() {
  const t = useTranslations("settings.marketData");
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const { data: rates, isLoading: ratesLoading } =
    trpc.marketData.getInterestRates.useQuery();

  const { data: benchmarks, isLoading: benchmarksLoading } =
    trpc.marketData.listRentBenchmarks.useQuery({});

  const syncMutation = trpc.marketData.syncInterestRates.useMutation({
    onSuccess: () => void utils.marketData.getInterestRates.invalidate(),
  });

  const deleteMutation = trpc.marketData.deleteRentBenchmark.useMutation({
    onSuccess: () => void utils.marketData.listRentBenchmarks.invalidate(),
  });

  return (
    <div className="space-y-6">
      {/* Interest Rates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("interestRates")}</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t("syncRates")}
          </Button>
        </div>

        {ratesLoading ? (
          <Skeleton className="h-16" />
        ) : rates && (rates.keyRate || rates.mortgageRate) ? (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-6">
                {[rates.keyRate, rates.mortgageRate]
                  .filter((r): r is NonNullable<typeof r> => r !== null)
                  .map((rate) => {
                    const latest = rate.entries[rate.entries.length - 1];
                    return (
                      <div key={rate.series} className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {rate.label}
                        </span>
                        <p className="text-lg font-semibold">
                          {latest
                            ? formatPercentage(latest.rateBasisPoints)
                            : "-"}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground text-center">
                {t("noRates")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rent Benchmarks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("rentBenchmarks")}</h3>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("addBenchmark")}
          </Button>
        </div>

        {benchmarksLoading ? (
          <Skeleton className="h-24" />
        ) : benchmarks && benchmarks.items.length > 0 ? (
          <Card>
            <CardContent className="pt-0 px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("region")}</TableHead>
                    <TableHead>{t("rentPerSqm")}</TableHead>
                    <TableHead>{t("validFrom")}</TableHead>
                    <TableHead>{t("source")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks.items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Badge variant="secondary">{b.region}</Badge>
                      </TableCell>
                      <TableCell>
                        {(
                          (b.data as { rentPerSqmCents: number })
                            .rentPerSqmCents / 100
                        ).toFixed(2)}{" "}
                        EUR/m²
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(b.data as { validFrom?: string }).validFrom ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(b.data as { source?: string }).source ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => deleteMutation.mutate({ id: b.id })}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground text-center">
                {t("noBenchmarks")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <RentBenchmarkDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
