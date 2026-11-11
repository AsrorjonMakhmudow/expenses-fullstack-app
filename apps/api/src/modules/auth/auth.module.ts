import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../config/env.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AUTH_SETTINGS, AuthService, daysToMs } from './auth.service.js';
import type { AuthSettings } from './auth.service.js';
import { Clock, SystemClock } from './clock.js';
import { DrizzleAuthRepository } from './drizzle-auth.repository.js';
import { Argon2PasswordHasher, PasswordHasher } from './password-hasher.js';
import { SessionGuard } from './session.guard.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Who is making each request (ADR 0009).
 * APP_GUARD = SessionGuard runs before EVERY route, so no endpoint can forget it.
 */
@Module({
  imports: [
    // Only used where @UseGuards(ThrottlerGuard) is set: sign-in and sign-up.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        { ttl: FIFTEEN_MINUTES_MS, limit: config.get('AUTH_RATE_LIMIT', { infer: true }) },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AuthRepository, useClass: DrizzleAuthRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: Clock, useClass: SystemClock },
    {
      provide: AUTH_SETTINGS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): AuthSettings => ({
        idleTimeoutMs: daysToMs(config.get('SESSION_IDLE_DAYS', { infer: true })),
        maxLifetimeMs: daysToMs(config.get('SESSION_MAX_DAYS', { infer: true })),
        registrationEnabled: config.get('REGISTRATION_ENABLED', { infer: true }),
      }),
    },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AuthModule {}
