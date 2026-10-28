/**
 * Applies pending SQL migrations from apps/api/drizzle/.
 *
 * Used in production (inside the server/container), where dev tools like drizzle-kit
 * are not installed:  node dist/infra/database/migrate.js
 * Locally you can also use:  pnpm --filter @expenses/api db:migrate
 */
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

export const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, '../../../drizzle');

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

// Run only when executed directly (not when imported by tests).
if (import.meta.filename === process.argv[1]) {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  await runMigrations(url);
  console.warn('Migrations applied');
}
