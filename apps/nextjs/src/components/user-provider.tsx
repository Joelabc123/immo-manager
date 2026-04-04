"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  language: string;
  currency: string;
  taxRate: number | null;
  retirementYear: number | null;
  healthScoreCashflowWeight: number;
  healthScoreLtvWeight: number;
  healthScoreYieldWeight: number;
  kpiPeriod: string;
  dscrTarget: number;
  donutThreshold: number;
  brokerFeeDefault: number;
  annualAppreciationDefault: number;
  capitalGainsTax: number;
  emailSignature: string | null;
  shareLinkValidityDays: number;
  pushEnabled: boolean;
  notifyNewEmail: boolean;
  notifyOverdueRent: boolean;
  notifyContractExpiry: boolean;
  trackingPixelEnabled: boolean;
}

interface UserContextValue {
  user: UserData | null;
  isLoading: boolean;
  refetch: () => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  refetch: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <UserContext.Provider
      value={{ user: data?.user ?? null, isLoading, refetch }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
