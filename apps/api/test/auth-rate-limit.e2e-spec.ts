import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';

// The other e2e files raise the limit (they sign in a lot). This file checks the real thing.
// Set BEFORE AppModule is imported: ConfigModule reads the environment at import time.
process.env['AUTH_RATE_LIMIT'] = '3';
const { AppModule } = await import('../src/app.module.js');
const { configureApp } = await import('../src/app.setup.js');

describe('Auth rate limit (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks password guessing: the 4th sign-in attempt in 15 minutes gets 429', async () => {
    const http = request(app.getHttpServer());
    const attempt = () =>
      http.post('/api/v1/auth/login').send({ email: 'victim@test.uz', password: 'guess guess 1' });
    await attempt().expect(401);
    await attempt().expect(401);
    await attempt().expect(401);
    await attempt().expect(429);
    // Other endpoints are not affected.
    await http.get('/api/v1/health').expect(200);
  });
});
