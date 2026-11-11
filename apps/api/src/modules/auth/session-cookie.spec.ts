import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { readCookie, sessionCookieName, sessionCookieOptions } from './session-cookie.js';

const withCookie = (cookie?: string) => ({ headers: { cookie } }) as unknown as Request;

describe('session cookie', () => {
  it('reads one cookie out of the header', () => {
    expect(readCookie(withCookie('theme=dark; session=abc123; x=1'), 'session')).toBe('abc123');
    expect(readCookie(withCookie('mysession=nope'), 'session')).toBeNull();
    expect(readCookie(withCookie('session='), 'session')).toBeNull();
    expect(readCookie(withCookie(), 'session')).toBeNull();
  });

  it('production: __Host- name, Secure; always HttpOnly + SameSite=Lax', () => {
    const expires = new Date();
    expect(sessionCookieName(true)).toBe('__Host-session');
    expect(sessionCookieOptions(true, expires)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires,
    });
    expect(sessionCookieOptions(false, expires)).toMatchObject({ httpOnly: true, secure: false });
  });
});
