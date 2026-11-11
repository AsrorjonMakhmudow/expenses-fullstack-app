import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

/** An HTTP client that keeps cookies, like a browser tab. */
export type Browser = ReturnType<typeof request.agent>;

export const TEST_PASSWORD = 'correct horse battery staple';

/** Registers a fresh user and returns a client that is signed in as them. */
export async function signedInBrowser(
  app: NestExpressApplication,
  email = `user-${randomUUID()}@test.uz`,
): Promise<{ browser: Browser; email: string; userId: string }> {
  const browser = request.agent(app.getHttpServer());
  const response = await browser
    .post('/api/v1/auth/register')
    .send({ email, password: TEST_PASSWORD })
    .expect(201);
  return { browser, email, userId: response.body.id as string };
}
