import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { rejectCrossSiteWrites } from './common/http/reject-cross-site-writes.js';
import type { Env } from './config/env.js';

/**
 * App-wide HTTP settings. Used by main.ts AND by the e2e tests,
 * so tests run against exactly the same setup as production (DRY).
 */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  app.setGlobalPrefix('api'); // → /api/...
  app.enableVersioning({ type: VersioningType.URI }); // → /api/v1/...
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.disable('x-powered-by'); // don't advertise "Express" to attackers
  // Behind Caddy, req.ip must be the visitor's address (rate limiting), not the proxy's.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));
  app.use(rejectCrossSiteWrites(config.get('APP_ORIGIN', { infer: true })));
  app.enableShutdownHooks(); // close DB connections on Ctrl+C / container stop
  return app;
}
