import type { UserDto } from '@expenses/shared';

export interface UserWithPassword extends UserDto {
  passwordHash: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  userAgent: string | null;
}

/** Storage for users and sessions — WHAT, not HOW (see ExpensesRepository for the why). */
export abstract class AuthRepository {
  abstract findUserByEmail(email: string): Promise<UserWithPassword | null>;
  /** null when the email is already taken (also under a race between two sign-ups). */
  abstract createUser(email: string, passwordHash: string): Promise<UserDto | null>;

  abstract createSession(session: SessionRecord): Promise<void>;
  abstract findSession(id: string): Promise<{ session: SessionRecord; user: UserDto } | null>;
  abstract touchSession(id: string, lastUsedAt: Date, expiresAt: Date): Promise<void>;
  abstract deleteSession(id: string): Promise<void>;
  abstract deleteUserSessions(userId: string): Promise<void>;
  abstract deleteExpiredSessions(now: Date): Promise<number>;
}
