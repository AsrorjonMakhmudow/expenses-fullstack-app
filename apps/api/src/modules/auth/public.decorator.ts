import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'auth:isPublic';

/**
 * Every route needs a signed-in user by default (secure by default: a new endpoint can't
 * forget it). Mark the few exceptions — sign-in, sign-up, health — with @Public().
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
