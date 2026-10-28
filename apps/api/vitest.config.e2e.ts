import path from 'node:path';
import { defineConfig } from 'vitest/config';

// End-to-end tests: real HTTP requests → real app → real TEST database.
// They use TEST_DATABASE_URL, so they can never wipe your real data.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../../.env'));
} catch {
  // CI provides the variables directly
}

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for e2e tests');

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      OWNER_EMAIL: process.env['OWNER_EMAIL'] ?? 'owner@example.com',
    },
    fileParallelism: false, // all test files share one database
    testTimeout: 20_000,
  },
});
