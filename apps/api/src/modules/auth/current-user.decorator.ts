import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from './auth.types.js';

/**
 * Gives a controller the id of the logged-in user:
 *   list(@CurrentUserId() userId: string) { ... }
 *
 * Controllers don't care HOW the user was identified (dev owner today, session cookie in
 * Phase 6). Only the guard changes later — every controller stays the same.
 */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) throw new UnauthorizedException();
  return request.user.id;
});
