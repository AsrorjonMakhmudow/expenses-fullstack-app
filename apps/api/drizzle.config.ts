import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit (dev tool) does not read .env by itself; load the root one if it exists.
// (Paths are relative to apps/api — pnpm runs package scripts from the package folder.)
try {
  process.loadEnvFile(path.resolve('../../.env'));
} catch {
  // no .env file — variables must come from the environment
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
  strict: true,
  verbose: true,
});
