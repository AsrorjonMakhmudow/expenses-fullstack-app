import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DevOwnerGuard } from './dev-owner.guard.js';
import { OwnerService } from './owner.service.js';

/**
 * Identifies who is making each request.
 * APP_GUARD = applied to EVERY route automatically, so no endpoint can forget it.
 */
@Module({
  providers: [OwnerService, { provide: APP_GUARD, useClass: DevOwnerGuard }],
})
export class AuthModule {}
