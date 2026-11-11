import type { UserDto } from '@expenses/shared';
import { Inject, Injectable } from '@nestjs/common';
import { eq, lte, or } from 'drizzle-orm';
import { DB } from '../../infra/database/database.module.js';
import type { Database } from '../../infra/database/database.module.js';
import { sessions, users } from '../../infra/database/schema.js';
import { AuthRepository } from './auth.repository.js';
import type { SessionRecord, UserWithPassword } from './auth.repository.js';

@Injectable()
export class DrizzleAuthRepository extends AuthRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super();
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  }

  async createUser(email: string, passwordHash: string): Promise<UserDto | null> {
    const [user] = await this.db
      .insert(users)
      .values({ email, passwordHash })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, email: users.email });
    return user ?? null;
  }

  async createSession(session: SessionRecord): Promise<void> {
    await this.db.insert(sessions).values(session);
  }

  async findSession(id: string): Promise<{ session: SessionRecord; user: UserDto } | null> {
    const [row] = await this.db
      .select({ session: sessions, user: { id: users.id, email: users.email } })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id));
    return row ?? null;
  }

  async touchSession(id: string, lastUsedAt: Date, expiresAt: Date): Promise<void> {
    await this.db.update(sessions).set({ lastUsedAt, expiresAt }).where(eq(sessions.id, id));
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpiredSessions(now: Date): Promise<number> {
    const deleted = await this.db
      .delete(sessions)
      .where(or(lte(sessions.expiresAt, now), lte(sessions.absoluteExpiresAt, now)))
      .returning({ id: sessions.id });
    return deleted.length;
  }
}
