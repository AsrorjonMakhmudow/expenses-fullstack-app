import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import type { Env } from '../../config/env.js';
import { DB } from '../../infra/database/database.module.js';
import type { Database } from '../../infra/database/database.module.js';
import { users } from '../../infra/database/schema.js';

/**
 * ⚠️ TEMPORARY — replaced by real authentication in Phase 6.
 *
 * Until then the app has exactly one user (you). On startup we make sure that user exists
 * and remember its id. The app REFUSES to start in production with this in place, so it
 * can never be deployed without a login by accident.
 */
@Injectable()
export class OwnerService implements OnApplicationBootstrap {
  private ownerId: string | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {
    if (config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new Error('Dev owner auth must not run in production. Implement Phase 6 (auth) first.');
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get('OWNER_EMAIL', { infer: true });
    await this.db.insert(users).values({ email }).onConflictDoNothing({ target: users.email });
    const [owner] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (!owner) throw new Error(`Owner user ${email} could not be created`);
    this.ownerId = owner.id;
  }

  getOwnerId(): string {
    if (!this.ownerId) throw new Error('Owner not initialised yet');
    return this.ownerId;
  }
}
