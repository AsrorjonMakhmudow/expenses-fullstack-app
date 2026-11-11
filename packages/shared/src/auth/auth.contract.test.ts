import { describe, expect, it } from 'vitest';
import { LoginSchema, PASSWORD_MAX_LENGTH, RegisterSchema } from './auth.contract.js';

describe('auth contract', () => {
  it('normalizes the email (trim + lower case)', () => {
    const parsed = RegisterSchema.parse({
      email: '  Asror@Mail.COM ',
      password: 'correct horse battery',
    });
    expect(parsed.email).toBe('asror@mail.com');
  });

  it.each([
    ['too short', { email: 'a@b.uz', password: 'short' }],
    ['too long', { email: 'a@b.uz', password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1) }],
    ['same as email', { email: 'longname@b.uz', password: 'LongName@b.uz' }],
    ['bad email', { email: 'not-an-email', password: 'correct horse battery' }],
  ])('register rejects: %s', (_case, body) => {
    expect(RegisterSchema.safeParse(body).success).toBe(false);
  });

  it('login does not apply the new-password rules (old passwords keep working)', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.uz', password: 'short' }).success).toBe(true);
    expect(LoginSchema.safeParse({ email: 'a@b.uz', password: '' }).success).toBe(false);
  });
});
