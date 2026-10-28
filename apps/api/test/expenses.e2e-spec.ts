import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DB } from '../src/infra/database/database.module.js';
import type { Database } from '../src/infra/database/database.module.js';

describe('Expenses API (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    await app.init();
    http = request(app.getHttpServer());
  });

  beforeEach(async () => {
    // Each test starts from an empty table → tests don't depend on each other.
    await app.get<Database>(DB).execute(sql`truncate table expenses`);
  });

  afterAll(async () => {
    await app.close();
  });

  const create = (body: object) => http.post('/api/v1/expenses').send(body);

  it('GET /health → database is up', async () => {
    await http.get('/api/v1/health').expect(200, { status: 'ok', database: 'up' });
  });

  it('full lifecycle: create → read → update → delete', async () => {
    const created = await create({
      date: '2026-10-04',
      amount: 65_000,
      description: 'билайн номеримга ташадим',
    }).expect(201);
    const { id } = created.body as { id: string };
    expect(created.body).toMatchObject({ amount: 65_000, currency: 'UZS', source: 'manual' });

    await http.get(`/api/v1/expenses/${id}`).expect(200);

    const updated = await http.patch(`/api/v1/expenses/${id}`).send({ amount: 70_000 }).expect(200);
    expect(updated.body).toMatchObject({ amount: 70_000, description: 'билайн номеримга ташадим' });

    await http.delete(`/api/v1/expenses/${id}`).expect(204);
    await http.get(`/api/v1/expenses/${id}`).expect(404);
  });

  it('filters by date range and text, newest first, with pagination', async () => {
    await create({ date: '2026-09-30', amount: 1_000, description: 'нон' });
    await create({ date: '2026-10-01', amount: 2_000, description: 'нон' });
    await create({ date: '2026-10-02', amount: 3_000, description: 'сут' });

    const october = await http.get('/api/v1/expenses?from=2026-10-01&to=2026-10-31').expect(200);
    expect(october.body.total).toBe(2);
    expect(october.body.items.map((e: { date: string }) => e.date)).toEqual([
      '2026-10-02',
      '2026-10-01',
    ]);

    const search = await http.get(`/api/v1/expenses?q=${encodeURIComponent('НОН')}`).expect(200);
    expect(search.body.total).toBe(2); // case-insensitive

    const page2 = await http.get('/api/v1/expenses?pageSize=2&page=2').expect(200);
    expect(page2.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(page2.body.items).toHaveLength(1);
  });

  it('treats % in search as a normal character', async () => {
    await create({ date: '2026-10-01', amount: 1_000, description: 'скидка 50%' });
    await create({ date: '2026-10-01', amount: 1_000, description: 'скидка 500' });
    const result = await http.get(`/api/v1/expenses?q=${encodeURIComponent('50%')}`).expect(200);
    expect(result.body.total).toBe(1);
  });

  it('rejects invalid input with 400 and field errors', async () => {
    const response = await create({ date: '2026-02-31', amount: 1.5, description: '' }).expect(400);
    expect(response.body.errors.map((e: { path: string }) => e.path).sort()).toEqual([
      'amount',
      'date',
      'description',
    ]);
    await http.get('/api/v1/expenses/not-a-uuid').expect(400);
    await http.get('/api/v1/expenses?from=2026-10-05&to=2026-10-01').expect(400);
  });

  it('stores big amounts exactly (beyond the 2.1 billion INT limit)', async () => {
    const { body } = await create({
      date: '2026-10-04',
      amount: 3_500_000_000,
      description: 'квартира',
    }).expect(201);
    expect(body.amount).toBe(3_500_000_000);
  });
});
