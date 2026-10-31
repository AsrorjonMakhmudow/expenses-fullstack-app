import type { ReactNode } from 'react';
import { EmptyState, ErrorMessage, Spinner } from './primitives';

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  error: unknown;
  refetch: () => unknown;
}

/**
 * Every data block has the same 4 states: loading, error, empty, data.
 * Writing them once here means no widget can forget one (DRY + consistent UX).
 */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  children,
}: {
  query: QueryLike<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Spinner />;
  if (query.error) return <ErrorMessage error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return null;
  if (isEmpty?.(query.data)) return <EmptyState>{empty ?? 'Nothing here yet.'}</EmptyState>;
  return <>{children(query.data)}</>;
}
