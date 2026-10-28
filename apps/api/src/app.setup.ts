import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * App-wide HTTP settings. Used by main.ts AND by the e2e tests,
 * so tests run against exactly the same setup as production (DRY).
 */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  app.setGlobalPrefix('api'); // → /api/...
  app.enableVersioning({ type: VersioningType.URI }); // → /api/v1/...
  app.disable('x-powered-by'); // don't advertise "Express" to attackers
  app.enableShutdownHooks(); // close DB connections on Ctrl+C / container stop
  return app;
}
