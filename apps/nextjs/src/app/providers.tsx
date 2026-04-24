"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="));
  return match?.split("=")[1];
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // Deduplicate concurrent refresh requests
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (
                error instanceof TRPCClientError &&
                error.data?.code === "UNAUTHORIZED"
              ) {
                return false; // Don't retry UNAUTHORIZED via react-query; handled by link
              }
              return failureCount < 3;
            },
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers() {
            const csrfToken = getCsrfToken();
            return csrfToken ? { "x-csrf-token": csrfToken } : {};
          },
          async fetch(url, options) {
            let response = await globalThis.fetch(url, options);

            if (response.status === 401) {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                // Retry original request with new access token (set via cookie)
                const newHeaders = new Headers(options?.headers);
                const newCsrf = getCsrfToken();
                if (newCsrf) {
                  newHeaders.set("x-csrf-token", newCsrf);
                }
                response = await globalThis.fetch(url, {
                  ...options,
                  headers: newHeaders,
                });
              }
            }

            return response;
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
