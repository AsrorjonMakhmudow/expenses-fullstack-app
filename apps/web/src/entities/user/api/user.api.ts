import type { AuthConfigDto, LoginInput, RegisterInput, UserDto } from '@expenses/shared';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, http, json } from '@/shared/api';

/** Sign-in / sign-up / sign-out calls. The session itself is an httpOnly cookie — JS never sees it. */
export const authApi = {
  config: () => http<AuthConfigDto>('/auth/config'),
  me: () => http<UserDto>('/auth/me'),
  login: (input: LoginInput) => http<UserDto>('/auth/login', { method: 'POST', body: json(input) }),
  register: (input: RegisterInput) =>
    http<UserDto>('/auth/register', { method: 'POST', body: json(input) }),
  logout: () => http<void>('/auth/logout', { method: 'POST' }),
  logoutAll: () => http<void>('/auth/logout-all', { method: 'POST' }),
};

export const userKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
  config: ['auth', 'config'] as const,
};

/** "Who am I?" — the user, or null when not signed in (401 is an answer, not an error). */
export const currentUserQuery = queryOptions({
  queryKey: userKeys.me,
  queryFn: async (): Promise<UserDto | null> => {
    try {
      return await authApi.me();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: 5 * 60_000,
});

export const authConfigQuery = queryOptions({
  queryKey: userKeys.config,
  queryFn: authApi.config,
  staleTime: Infinity,
});
