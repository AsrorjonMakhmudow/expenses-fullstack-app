import type { CookieOptions, Request } from 'express';

/**
 * `__Host-` prefix (production): the browser only accepts it with Secure + Path=/ and no
 * Domain, so no subdomain or plain-HTTP page can overwrite the session cookie.
 * Over plain http://localhost the prefix isn't allowed, so development uses a plain name.
 */
export function sessionCookieName(production: boolean): string {
  return production ? '__Host-session' : 'session';
}

export function sessionCookieOptions(production: boolean, expires: Date): CookieOptions {
  return {
    httpOnly: true, // JavaScript can't read it → XSS can't steal it
    secure: production,
    sameSite: 'lax', // not sent with cross-site POSTs → basic CSRF protection
    path: '/',
    expires,
  };
}

/** Reads one cookie from the Cookie header (no cookie-parser dependency needed). */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      const value = part.slice(separator + 1).trim();
      return value === '' ? null : value;
    }
  }
  return null;
}
