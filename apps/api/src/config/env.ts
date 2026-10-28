import path from 'node:path';
import { z } from 'zod';

/**
 * Every environment variable the API needs, validated ONCE at startup.
 * "Fail fast": a missing or wrong value stops the app immediately with a clear message,
 * instead of crashing an hour later in the middle of a request.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /**
   * TEMPORARY (until Phase 6 — auth): the single owner of all data.
   * Created automatically on startup if missing.
   */
  OWNER_EMAIL: z.email(),
});

export type Env = z.output<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/**
 * We keep ONE .env at the repository root (shared with docker compose).
 * Same relative depth from src/ and dist/, so this works in dev and after build.
 * In production there is no file: variables come from the real environment.
 */
export const ROOT_ENV_FILE = path.resolve(import.meta.dirname, '../../../../.env');
