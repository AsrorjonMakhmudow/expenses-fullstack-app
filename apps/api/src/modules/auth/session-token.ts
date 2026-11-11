import { createHash, randomBytes } from 'node:crypto';

/** 32 random bytes = 256 bits: impossible to guess. URL-safe, so fine in a cookie. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * What the database stores instead of the token. SHA-256 (not argon2) is right here: the
 * token is already random and long, so there is nothing to brute-force — and it's fast,
 * which matters because it runs on every request.
 */
export function sessionIdFromToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
