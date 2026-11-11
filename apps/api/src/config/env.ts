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
  /** Sign out after this many days without using the app (see ADR 0009). */
  SESSION_IDLE_DAYS: z.coerce.number().int().min(1).max(365).default(14),
  /** Sign out after this many days even if the app is used every day. */
  SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(365).default(60),
  /** "false" closes sign-up (existing users can still sign in). */
  REGISTRATION_ENABLED: z.stringbool().default(true),
  /** Where the web app runs. Changes (POST/PATCH/DELETE) from any other site are refused. */
  APP_ORIGIN: z
    .url()
    .default('http://localhost:5173')
    .transform((url) => new URL(url).origin),
  /** Sign-in / sign-up attempts allowed per IP address per 15 minutes. */
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  /** Reverse proxies in front of the API (Caddy in production = 1), so req.ip is the real client. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Env = z.output<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.refine((env) => env.SESSION_MAX_DAYS >= env.SESSION_IDLE_DAYS, {
    message: 'SESSION_MAX_DAYS must be at least SESSION_IDLE_DAYS',
    path: ['SESSION_MAX_DAYS'],
  }).safeParse(raw);
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
