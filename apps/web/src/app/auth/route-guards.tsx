import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { currentUserQuery, sessionExpiry } from '@/entities/user';
import { ErrorMessage, Spinner } from '@/shared/ui';

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center px-4">{children}</div>;
}

/** Pages behind sign-in. Not signed in (or session expired) → /login, remembering where you were. */
export function RequireAuth() {
  const location = useLocation();
  const me = useQuery(currentUserQuery);

  if (me.isPending) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  if (me.isError) {
    return (
      <FullScreen>
        <ErrorMessage error={me.error} onRetry={() => void me.refetch()} />
      </FullScreen>
    );
  }
  if (!me.data) {
    const from = `${location.pathname}${location.search}`;
    const reason = sessionExpiry.isExpired() ? 'expired' : undefined;
    return <Navigate to="/login" replace state={{ from, reason }} />;
  }
  return <Outlet />;
}

/** Sign-in / sign-up pages: already signed in → straight to the app. */
export function GuestOnly() {
  const me = useQuery(currentUserQuery);
  if (me.isPending) {
    return (
      <FullScreen>
        <Spinner />
      </FullScreen>
    );
  }
  return me.data ? <Navigate to="/" replace /> : <Outlet />;
}
