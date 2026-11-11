import type { Request } from 'express';

/** Who is making the request — set by SessionGuard. */
export interface AuthUser {
  id: string;
  email: string;
  /** Hash of the cookie token: lets logout delete exactly this session. */
  sessionId: string;
}

export type RequestWithUser = Request & { user?: AuthUser };
