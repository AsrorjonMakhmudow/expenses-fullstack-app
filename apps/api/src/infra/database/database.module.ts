import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Env } from '../../config/env.js';
import { schema } from './schema.js';
import type { Schema } from './schema.js';

/** Injection tokens. Interfaces/types disappear at runtime, so DI needs real values as keys. */
export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

export type Database = NodePgDatabase<Schema>;

/**
 * @Global: every module can inject DB without importing DatabaseModule again.
 * Use @Global sparingly — only for true infrastructure like the database or config.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      // A pool keeps a few connections open and reuses them — opening one per request is slow.
      useFactory: (config: ConfigService<Env, true>) =>
        new pg.Pool({ connectionString: config.get('DATABASE_URL', { infer: true }), max: 10 }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  /** Close connections cleanly on shutdown (Ctrl+C, deploy restart). */
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
