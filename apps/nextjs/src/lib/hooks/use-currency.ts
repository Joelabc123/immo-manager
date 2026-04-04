import { useMemo } from "react";
import {
  formatCurrency as formatCurrencyRaw,
  formatCompactCurrency as formatCompactCurrencyRaw,
} from "@repo/shared/utils";
import { useUser } from "@/components/user-provider";

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
};

export function useCurrency() {
  const { user } = useUser();
  const currency = user?.currency ?? "EUR";
  const locale = LANGUAGE_LOCALE_MAP[user?.language ?? "de"] ?? "de-DE";

  return useMemo(
    () => ({
      currency,
      locale,
      formatCurrency: (amountCents: number) =>
        formatCurrencyRaw(amountCents, currency, locale),
      formatCompactCurrency: (amountCents: number) =>
        formatCompactCurrencyRaw(amountCents, currency, locale),
    }),
    [currency, locale],
  );
}
