import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { Env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import type { RequestWithUser } from './auth.types.js';
import { IS_PUBLIC } from './public.decorator.js';
import { readCookie, sessionCookieName } from './session-cookie.js';

/**
 * Runs before EVERY route (registered as APP_GUARD). Lets the request through only with a
 * valid, unexpired session cookie — unless the route is marked @Public().
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
    config: ConfigService<Env, true>,
  ) {
    this.cookieName = sessionCookieName(config.get('NODE_ENV', { infer: true }) === 'production');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const token = readCookie(request, this.cookieName);
    const user = token ? await this.auth.authenticate(token) : null;
    if (!user) {
      // A dead cookie is useless — tell the browser to drop it.
      if (token) http.getResponse<Response>().clearCookie(this.cookieName, { path: '/' });
      throw new UnauthorizedException('Not signed in');
    }
    request.user = user;
    return true;
  }
}
