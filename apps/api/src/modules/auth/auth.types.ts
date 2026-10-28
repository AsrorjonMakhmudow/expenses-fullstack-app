import type { Request } from 'express';

export interface AuthUser {
  id: string;
}

export type RequestWithUser = Request & { user?: AuthUser };
