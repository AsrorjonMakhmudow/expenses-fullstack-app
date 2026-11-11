import { randomUUID } from 'node:crypto';
import type { UserDto } from '@expenses/shared';
import { AuthRepository } from '../auth.repository.js';
import type { SessionRecord, UserWithPassword } from '../auth.repository.js';

/** Fast fake for unit tests. Same behaviour as the Drizzle version, kept in plain arrays. */
export class InMemoryAuthRepository extends AuthRepository {
  readonly users: UserWithPassword[] = [];
  readonly sessions: SessionRecord[] = [];

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async createUser(email: string, passwordHash: string): Promise<UserDto | null> {
    if (this.users.some((u) => u.email === email)) return null;
    const user = { id: randomUUID(), email, passwordHash };
    this.users.push(user);
    return { id: user.id, email };
  }

  async createSession(session: SessionRecord): Promise<void> {
    this.sessions.push({ ...session });
  }

  async findSession(id: string): Promise<{ session: SessionRecord; user: UserDto } | null> {
    const session = this.sessions.find((s) => s.id === id);
    const user = session && this.users.find((u) => u.id === session.userId);
    return session && user
      ? { session: { ...session }, user: { id: user.id, email: user.email } }
      : null;
  }

  async touchSession(id: string, lastUsedAt: Date, expiresAt: Date): Promise<void> {
    const session = this.sessions.find((s) => s.id === id);
    if (session) Object.assign(session, { lastUsedAt, expiresAt });
  }

  async deleteSession(id: string): Promise<void> {
    this.remove((s) => s.id === id);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    this.remove((s) => s.userId === userId);
  }

  async deleteExpiredSessions(now: Date): Promise<number> {
    return this.remove((s) => s.expiresAt <= now || s.absoluteExpiresAt <= now);
  }

  private remove(match: (s: SessionRecord) => boolean): number {
    const before = this.sessions.length;
    const keep = this.sessions.filter((s) => !match(s));
    this.sessions.splice(0, this.sessions.length, ...keep);
    return before - keep.length;
  }
}
