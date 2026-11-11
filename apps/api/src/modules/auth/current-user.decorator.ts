import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithUser } from './auth.types.js';

function userFrom(ctx: ExecutionContext): AuthUser {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) throw new UnauthorizedException();
  return request.user;
}

/**
 * Gives a controller the id of the signed-in user:
 *   list(@CurrentUserId() userId: string) { ... }
 * Controllers don't care HOW the user was identified — that's SessionGuard's job.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => userFrom(ctx).id,
);

/** The whole signed-in user (id, email, sessionId) — for the auth controller. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  userFrom(ctx),
);
