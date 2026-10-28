import { Controller, Get, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../../infra/database/database.module.js';
import type { Database } from '../../infra/database/database.module.js';

/**
 * GET /api/v1/health — "is the app alive and can it reach the database?"
 * Used later by Docker and uptime monitoring to restart or alert.
 */
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
