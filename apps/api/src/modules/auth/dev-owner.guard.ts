import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from './auth.types.js';
import { OwnerService } from './owner.service.js';

/**
 * ⚠️ TEMPORARY — Phase 6 replaces this with a guard that checks the session cookie.
 *
 * A "guard" runs before every request and decides: may this request continue?
 * This one always says yes and marks the request as made by the owner.
 */
@Injectable()
export class DevOwnerGuard implements CanActivate {
  constructor(private readonly owner: OwnerService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = { id: this.owner.getOwnerId() };
    return true;
  }
}
