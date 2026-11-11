import type { UserDto } from '@expenses/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { sessionExpiry, userKeys } from '@/entities/user';

/** Where the user wanted to go before being sent to sign in (set by the route guard). */
export function useReturnPath(): string {
  const state = useLocation().state as { from?: string } | null;
  return state?.from && state.from.startsWith('/') ? state.from : '/';
}

/**
 * After a successful sign-in / sign-up: forget every cached response (it may belong to a
 * previous user on this computer), remember the new user, go where they wanted to go.
 */
export function useStartSession() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const returnPath = useReturnPath();
  return (user: UserDto) => {
    client.clear();
    sessionExpiry.clear();
    client.setQueryData(userKeys.me, user);
    void navigate(returnPath, { replace: true });
  };
}
