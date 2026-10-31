import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '@/shared/api';

/**
 * TanStack Query = a cache for server data. It fetches, remembers, refetches when stale,
 * and shares one request between all components asking for the same data.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // data younger than 30 s is "fresh": no refetch
            // Retry network hiccups, but not 4xx errors — those won't fix themselves.
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
              failureCount < 2,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
