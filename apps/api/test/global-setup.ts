import { runMigrations } from '../src/infra/database/migrate.js';

/** Runs once before all e2e tests: bring the test database schema up to date. */
export default async function setup(): Promise<void> {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) throw new Error('TEST_DATABASE_URL is required for e2e tests');
  await runMigrations(url);
}
