import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DB } from '../src/infra/database/database.module.js';
import type { Database } from '../src/infra/database/database.module.js';
import { TEST_PASSWORD, signedInBrowser } from './support/sign-in.js';

const EXPENSE = { date: '2026-10-04', amount: 65_000, description: 'билайн' };

describe('Auth API (e2e)', () => {
  let app: NestExpressApplication;
  let db: Database;
  const anonymous = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    await app.init();
    db = app.get<Database>(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  it('everything is private by default; health and auth/config are public', async () => {
    await anonymous().get('/api/v1/expenses').expect(401);
    await anonymous().get('/api/v1/stats/summary').expect(401);
    await anonymous().get('/api/v1/auth/me').expect(401);
    await anonymous().get('/api/v1/health').expect(200);
    await anonymous().get('/api/v1/auth/config').expect(200, { registrationEnabled: true });
  });

  it('register → signed in with a safe cookie → me → logout → 401', async () => {
    const browser = request.agent(app.getHttpServer());
    const email = `Asror.${Date.now()}@Mail.UZ`;
    const registered = await browser
      .post('/api/v1/auth/register')
      .send({ email: ` ${email} `, password: TEST_PASSWORD })
      .expect(201);
    expect(registered.body).toEqual({ id: expect.any(String), email: email.toLowerCase() });

    const cookie = String(registered.headers['set-cookie']);
    expect(cookie).toMatch(/^session=[\w-]{43};/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Expires=/);

    await browser.get('/api/v1/auth/me').expect(200, registered.body);
    await browser.post('/api/v1/expenses').send(EXPENSE).expect(201);

    const out = await browser.post('/api/v1/auth/logout').expect(204);
    expect(String(out.headers['set-cookie'])).toMatch(/session=;.*Expires=Thu, 01 Jan 1970/);
    await browser.get('/api/v1/auth/me').expect(401);
  });

  it('login: right password works; wrong password and unknown email look the same', async () => {
    const { email } = await signedInBrowser(app);
    const browser = request.agent(app.getHttpServer());
    await browser.post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);
    await browser.get('/api/v1/auth/me').expect(200);

    const wrong = await anonymous()
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong password!' })
      .expect(401);
    const unknown = await anonymous()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.uz', password: 'wrong password!' })
      .expect(401);
    expect(wrong.body.message).toBe('Wrong email or password');
    expect(unknown.body).toEqual(wrong.body);
  });

  it('register: validation errors and duplicate email', async () => {
    await anonymous()
      .post('/api/v1/auth/register')
      .send({ email: 'x@test.uz', password: 'short' })
      .expect(400);
    const { email } = await signedInBrowser(app);
    await anonymous()
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password: TEST_PASSWORD })
      .expect(409);
  });

  it('users never see each other’s data', async () => {
    const alice = await signedInBrowser(app);
    const bob = await signedInBrowser(app);
    const created = await alice.browser.post('/api/v1/expenses').send(EXPENSE).expect(201);

    const bobsList = await bob.browser.get('/api/v1/expenses').expect(200);
    expect(bobsList.body.items.map((e: { id: string }) => e.id)).not.toContain(created.body.id);
    await bob.browser.get(`/api/v1/expenses/${created.body.id}`).expect(404);
    await bob.browser.delete(`/api/v1/expenses/${created.body.id}`).expect(404);
    await alice.browser.get(`/api/v1/expenses/${created.body.id}`).expect(200);
  });

  it('expiry: a session idle past its limit is refused, deleted and its cookie cleared', async () => {
    const { browser, userId } = await signedInBrowser(app);
    await browser.get('/api/v1/auth/me').expect(200);

    // Pretend the last use was 15 days ago.
    await db.execute(
      sql`update sessions set expires_at = now() - interval '1 day' where user_id = ${userId}`,
    );
    const refused = await browser.get('/api/v1/auth/me').expect(401);
    expect(String(refused.headers['set-cookie'])).toMatch(/session=;/);
    const left = await db.execute(
      sql`select count(*)::int as n from sessions where user_id = ${userId}`,
    );
    expect(left.rows[0]).toEqual({ n: 0 });
  });

  it('expiry: the absolute limit wins even if the idle one is fine', async () => {
    const { browser, userId } = await signedInBrowser(app);
    await db.execute(
      sql`update sessions set absolute_expires_at = now() - interval '1 second' where user_id = ${userId}`,
    );
    await browser.get('/api/v1/auth/me').expect(401);
  });

  it('logout-all signs out every browser of that user', async () => {
    const { browser: laptop, email } = await signedInBrowser(app);
    const phone = request.agent(app.getHttpServer());
    await phone.post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);

    await laptop.post('/api/v1/auth/logout-all').expect(204);
    await laptop.get('/api/v1/auth/me').expect(401);
    await phone.get('/api/v1/auth/me').expect(401);
  });

  it('CSRF: changes coming from another website are refused', async () => {
    const { browser } = await signedInBrowser(app);
    await browser
      .post('/api/v1/expenses')
      .set('Origin', 'https://evil.example')
      .set('Sec-Fetch-Site', 'cross-site')
      .send(EXPENSE)
      .expect(403);
    await browser
      .post('/api/v1/expenses')
      .set('Origin', 'http://localhost:5173')
      .set('Sec-Fetch-Site', 'same-origin')
      .send(EXPENSE)
      .expect(201);
  });

  it('the database stores a hash of the token, never the token', async () => {
    const browser = request.agent(app.getHttpServer());
    const res = await browser
      .post('/api/v1/auth/register')
      .send({ email: `hash-${Date.now()}@test.uz`, password: TEST_PASSWORD })
      .expect(201);
    const token = /session=([^;]+)/.exec(String(res.headers['set-cookie']))?.[1] ?? '';
    const found = await db.execute(
      sql`select count(*)::int as n from sessions where id = ${token}`,
    );
    expect(found.rows[0]).toEqual({ n: 0 });
    const user = await db.execute(
      sql`select password_hash from users where id = ${res.body.id as string}`,
    );
    expect(String(user.rows[0]?.['password_hash'])).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });
});
