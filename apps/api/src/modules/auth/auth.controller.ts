import { LoginSchema, RegisterSchema } from '@expenses/shared';
import type { AuthConfigDto, LoginInput, RegisterInput, UserDto } from '@expenses/shared';
import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { Env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import type { IssuedSession } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { readCookie, sessionCookieName, sessionCookieOptions } from './session-cookie.js';
import { sessionIdFromToken } from './session-token.js';

/**
 *   GET  /api/v1/auth/config      → { registrationEnabled }
 *   POST /api/v1/auth/register    { email, password } → 201 + session cookie
 *   POST /api/v1/auth/login       { email, password } → 200 + session cookie
 *   POST /api/v1/auth/logout      → 204, cookie cleared
 *   POST /api/v1/auth/logout-all  → 204, every session of this user ended
 *   GET  /api/v1/auth/me          → { id, email } or 401
 */
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly production: boolean;
  private readonly cookieName: string;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.production = config.get('NODE_ENV', { infer: true }) === 'production';
    this.cookieName = sessionCookieName(this.production);
  }

  @Public()
  @Get('config')
  config(): AuthConfigDto {
    return { registrationEnabled: this.auth.registrationEnabled };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    return this.start(await this.auth.register(body, request.get('user-agent') ?? null), response);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    return this.start(await this.auth.login(body, request.get('user-agent') ?? null), response);
  }

  /** Public: signing out must work even with an already-expired cookie. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readCookie(request, this.cookieName);
    if (token) await this.auth.logout(sessionIdFromToken(token));
    this.clear(response);
  }

  @Post('logout-all')
  @HttpCode(204)
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logoutAll(user.id);
    this.clear(response);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): UserDto {
    return { id: user.id, email: user.email };
  }

  private start(session: IssuedSession, response: Response): UserDto {
    response.cookie(
      this.cookieName,
      session.token,
      sessionCookieOptions(this.production, session.cookieExpires),
    );
    return session.user;
  }

  private clear(response: Response): void {
    const { expires: _ignored, ...options } = sessionCookieOptions(this.production, new Date());
    response.clearCookie(this.cookieName, options);
  }
}
