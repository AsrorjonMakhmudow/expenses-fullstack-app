import type { LoginInput, RegisterInput, UserDto } from '@expenses/shared';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';
import type { AuthUser } from './auth.types.js';
import { Clock } from './clock.js';
import { PasswordHasher } from './password-hasher.js';
import { newSessionToken, sessionIdFromToken } from './session-token.js';

export const AUTH_SETTINGS = Symbol('AUTH_SETTINGS');

export interface AuthSettings {
  /** Signed out after this long without using the app. */
  idleTimeoutMs: number;
  /** Signed out after this long no matter what. */
  maxLifetimeMs: number;
  registrationEnabled: boolean;
}

/** Sliding the idle expiry costs a database write — do it at most once per hour per session. */
export const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
export const daysToMs = (days: number) => days * DAY_MS;

/** What the controller needs to set the cookie. */
export interface IssuedSession {
  user: UserDto;
  token: string;
  /** Cookie expiry = the hard limit; the server still enforces the idle limit itself. */
  cookieExpires: Date;
}

const WRONG_CREDENTIALS = 'Wrong email or password';

/**
 * Sign-up, sign-in, sign-out and "who is this cookie?" (ADR 0009).
 * No HTTP here: the controller turns results into cookies and status codes.
 */
@Injectable()
export class AuthService {
  /** A real argon2 hash of a random password, so unknown emails take as long as wrong passwords. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly repository: AuthRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
  ) {}

  get registrationEnabled(): boolean {
    return this.settings.registrationEnabled;
  }

  async register(input: RegisterInput, userAgent: string | null): Promise<IssuedSession> {
    if (!this.settings.registrationEnabled) {
      throw new ForbiddenException('Registration is closed');
    }
    if (await this.repository.findUserByEmail(input.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.repository.createUser(
      input.email,
      await this.hasher.hash(input.password),
    );
    if (!user) throw new ConflictException('An account with this email already exists');
    return this.issueSession(user, userAgent);
  }

  async login(input: LoginInput, userAgent: string | null): Promise<IssuedSession> {
    const found = await this.repository.findUserByEmail(input.email);
    if (!found?.passwordHash) {
      // Same work and same answer as a wrong password: nobody can probe which emails exist.
      await this.hasher.verify(await this.getDummyHash(), input.password);
      throw new UnauthorizedException(WRONG_CREDENTIALS);
    }
    if (!(await this.hasher.verify(found.passwordHash, input.password))) {
      throw new UnauthorizedException(WRONG_CREDENTIALS);
    }
    // Good moment to sweep: old rows never pile up, and no background job is needed.
    await this.repository.deleteExpiredSessions(this.clock.now());
    return this.issueSession({ id: found.id, email: found.email }, userAgent);
  }

  /**
   * The cookie → user check behind every request. null = not signed in (missing, unknown,
   * or expired token). Expired sessions are deleted on the spot.
   */
  async authenticate(token: string): Promise<AuthUser | null> {
    const sessionId = sessionIdFromToken(token);
    const found = await this.repository.findSession(sessionId);
    if (!found) return null;

    const { session, user } = found;
    const now = this.clock.now();
    if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
      await this.repository.deleteSession(sessionId);
      return null;
    }

    if (now.getTime() - session.lastUsedAt.getTime() >= TOUCH_INTERVAL_MS) {
      await this.repository.touchSession(
        sessionId,
        now,
        this.idleExpiry(now, session.absoluteExpiresAt),
      );
    }
    return { id: user.id, email: user.email, sessionId };
  }

  logout(sessionId: string): Promise<void> {
    return this.repository.deleteSession(sessionId);
  }

  /** "Sign out everywhere" — e.g. after losing a phone. */
  logoutAll(userId: string): Promise<void> {
    return this.repository.deleteUserSessions(userId);
  }

  private async issueSession(user: UserDto, userAgent: string | null): Promise<IssuedSession> {
    const token = newSessionToken();
    const now = this.clock.now();
    const absoluteExpiresAt = new Date(now.getTime() + this.settings.maxLifetimeMs);
    await this.repository.createSession({
      id: sessionIdFromToken(token),
      userId: user.id,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: this.idleExpiry(now, absoluteExpiresAt),
      absoluteExpiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    });
    return { user, token, cookieExpires: absoluteExpiresAt };
  }

  /** Idle expiry never goes past the hard limit. */
  private idleExpiry(now: Date, absoluteExpiresAt: Date): Date {
    return new Date(
      Math.min(now.getTime() + this.settings.idleTimeoutMs, absoluteExpiresAt.getTime()),
    );
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(newSessionToken());
    return this.dummyHash;
  }
}
