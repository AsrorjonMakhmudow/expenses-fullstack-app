import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection, second layer (the first is the SameSite=Lax cookie).
 * A request that CHANGES something (POST/PATCH/DELETE) is refused when the browser says it
 * comes from another website:
 *   - `Sec-Fetch-Site: cross-site` (all current browsers send it), or
 *   - an `Origin` that isn't our web app (older browsers).
 * Requests without these headers (curl, the mobile app, tests) aren't from a browser page,
 * so they can't be CSRF — they still need a valid session to do anything.
 */
export function rejectCrossSiteWrites(appOrigin: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(request.method)) return next();

    const fetchSite = request.get('sec-fetch-site');
    const origin = request.get('origin');
    const crossSite =
      fetchSite === 'cross-site' ||
      (fetchSite !== 'same-origin' && origin !== undefined && origin !== appOrigin);

    if (crossSite) {
      response.status(403).json({ statusCode: 403, message: 'Cross-site request refused' });
      return;
    }
    next();
  };
}
