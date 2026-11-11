import type { QueryClient } from '@tanstack/react-query';
import { sessionExpiry, userKeys } from '@/entities/user';
import { setUnauthorizedHandler } from '@/shared/api';

/**
 * Any request answered "401 Not signed in" while we thought we were signed in means the
 * session ended on the server (14 days idle, 60 days max, or "sign out everywhere").
 * Drop all cached data and mark the user as signed out — RequireAuth then shows /login
 * with "Your session expired".
 */
export function installSessionExpiryHandler(client: QueryClient): () => void {
  setUnauthorizedHandler(() => {
    if (!client.getQueryData(userKeys.me)) return; // wasn't signed in: nothing expired
    sessionExpiry.mark();
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== userKeys.all[0] });
    client.setQueryData(userKeys.me, null);
  });
  return () => setUnauthorizedHandler(null);
}
