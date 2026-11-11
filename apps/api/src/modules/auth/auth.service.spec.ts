import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService, TOUCH_INTERVAL_MS, daysToMs } from './auth.service.js';
import type { AuthSettings } from './auth.service.js';
import { Clock } from './clock.js';
import { PasswordHasher } from './password-hasher.js';
import { sessionIdFromToken } from './session-token.js';
import { InMemoryAuthRepository } from './testing/in-memory-auth.repository.js';

/** Real argon2 is slow on purpose — tests use a transparent fake. */
class FakeHasher extends PasswordHasher {
  verifyCalls = 0;
  async hash(password: string) {
    return `hashed:${password}`;
  }
  async verify(hash: string, password: string) {
    this.verifyCalls++;
    return hash === `hashed:${password}`;
  }
}

class FakeClock extends Clock {
  time = new Date('2026-11-11T09:00:00Z');
  now() {
    return new Date(this.time);
  }
  advance(ms: number) {
    this.time = new Date(this.time.getTime() + ms);
  }
}

const IDLE_DAYS = 14;
const MAX_DAYS = 60;
const HOUR = 60 * 60 * 1000;
const ME = { email: 'asror@mail.uz', password: 'correct horse battery' };

describe('AuthService', () => {
  let repository: InMemoryAuthRepository;
  let hasher: FakeHasher;
  let clock: FakeClock;
  let settings: AuthSettings;
  let service: AuthService;

  beforeEach(() => {
    repository = new InMemoryAuthRepository();
    hasher = new FakeHasher();
    clock = new FakeClock();
    settings = {
      idleTimeoutMs: daysToMs(IDLE_DAYS),
      maxLifetimeMs: daysToMs(MAX_DAYS),
      registrationEnabled: true,
    };
    service = new AuthService(repository, hasher, clock, settings);
  });

  describe('register', () => {
    it('creates the user with a HASHED password and signs them in', async () => {
      const { user, token } = await service.register(ME, 'Safari');
      expect(user.email).toBe(ME.email);
      expect(repository.users[0]?.passwordHash).toBe(`hashed:${ME.password}`);
      expect(await service.authenticate(token)).toMatchObject({ id: user.id, email: ME.email });
    });

    it('stores only the SHA-256 of the token, never the token itself', async () => {
      const { token } = await service.register(ME, null);
      expect(repository.sessions[0]?.id).toBe(sessionIdFromToken(token));
      expect(JSON.stringify(repository.sessions)).not.toContain(token);
    });

    it('refuses a second account with the same email', async () => {
      await service.register(ME, null);
      await expect(service.register(ME, null)).rejects.toBeInstanceOf(ConflictException);
    });

    it('can be closed with REGISTRATION_ENABLED=false', async () => {
      settings.registrationEnabled = false;
      await expect(service.register(ME, null)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register(ME, null);
    });

    it('signs in with the right password', async () => {
      const { user } = await service.login(ME, null);
      expect(user.email).toBe(ME.email);
    });

    it('gives the SAME answer for a wrong password and an unknown email', async () => {
      const wrongPassword = service.login({ ...ME, password: 'nope nope nope' }, null);
      const unknownEmail = service.login({ ...ME, email: 'nobody@mail.uz' }, null);
      await expect(wrongPassword).rejects.toThrow(
        new UnauthorizedException('Wrong email or password'),
      );
      await expect(unknownEmail).rejects.toThrow(
        new UnauthorizedException('Wrong email or password'),
      );
    });

    it('still runs a password check for unknown emails (no timing difference)', async () => {
      hasher.verifyCalls = 0;
      await service.login({ ...ME, email: 'nobody@mail.uz' }, null).catch(() => undefined);
      expect(hasher.verifyCalls).toBe(1);
    });

    it('a user without a password (old dev owner) cannot sign in', async () => {
      repository.users.push({ id: 'old-owner', email: 'owner@mail.uz', passwordHash: null });
      await expect(
        service.login({ email: 'owner@mail.uz', password: 'x' }, null),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('sweeps expired sessions on sign-in', async () => {
      clock.advance(daysToMs(IDLE_DAYS + 1));
      await service.login(ME, null);
      expect(repository.sessions).toHaveLength(1); // the old one is gone, the new one is there
    });
  });

  describe('expiry', () => {
    it('idle: signed out after 14 days without use', async () => {
      const { token } = await service.register(ME, null);
      clock.advance(daysToMs(IDLE_DAYS) - HOUR);
      expect(await service.authenticate(token)).not.toBeNull();

      clock.advance(daysToMs(IDLE_DAYS) + 1); // 14 days since that last use
      expect(await service.authenticate(token)).toBeNull();
      expect(repository.sessions).toHaveLength(0); // deleted on the spot
    });

    it('using the app pushes the idle expiry forward', async () => {
      const { token } = await service.register(ME, null);
      for (let week = 0; week < 6; week++) {
        clock.advance(daysToMs(7)); // used once a week — never 14 days idle
        expect(await service.authenticate(token)).not.toBeNull();
      }
    });

    it('absolute: signed out after 60 days even when used every week', async () => {
      const { token, cookieExpires } = await service.register(ME, null);
      expect(cookieExpires.getTime() - clock.now().getTime()).toBe(daysToMs(MAX_DAYS));
      for (let day = 7; day < MAX_DAYS; day += 7) {
        clock.advance(daysToMs(7));
        expect(await service.authenticate(token)).not.toBeNull();
      }
      clock.advance(
        daysToMs(MAX_DAYS) - (clock.now().getTime() - new Date('2026-11-11T09:00:00Z').getTime()),
      );
      expect(await service.authenticate(token)).toBeNull();
    });

    it('the idle expiry never moves past the absolute one', async () => {
      const { token } = await service.register(ME, null);
      clock.advance(daysToMs(MAX_DAYS - 2));
      await service.authenticate(token);
      expect(repository.sessions[0]?.expiresAt).toEqual(repository.sessions[0]?.absoluteExpiresAt);
    });

    it('writes "last used" at most once per hour (not on every request)', async () => {
      const { token } = await service.register(ME, null);
      const first = repository.sessions[0]?.lastUsedAt;
      clock.advance(TOUCH_INTERVAL_MS - 1000);
      await service.authenticate(token);
      expect(repository.sessions[0]?.lastUsedAt).toEqual(first);
      clock.advance(2000);
      await service.authenticate(token);
      expect(repository.sessions[0]?.lastUsedAt).toEqual(clock.now());
    });
  });

  describe('logout', () => {
    it('ends this session only; logout-all ends every session of the user', async () => {
      const laptop = await service.register(ME, 'laptop');
      const phone = await service.login(ME, 'phone');
      const laptopUser = await service.authenticate(laptop.token);

      await service.logout(laptopUser!.sessionId);
      expect(await service.authenticate(laptop.token)).toBeNull();
      expect(await service.authenticate(phone.token)).not.toBeNull();

      const tablet = await service.login(ME, 'tablet');
      await service.logoutAll(laptopUser!.id);
      expect(await service.authenticate(phone.token)).toBeNull();
      expect(await service.authenticate(tablet.token)).toBeNull();
    });

    it('an unknown or garbage token is simply "not signed in"', async () => {
      expect(await service.authenticate('made-up-token')).toBeNull();
    });
  });
});
