import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DB } from '../src/infra/database/database.module.js';
import { TODAY } from '../src/modules/stats/stats.service.js';
import type { Database } from '../src/infra/database/database.module.js';

describe('Stats API (e2e)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // Freeze "today" so results don't depend on the day the tests run.
      .overrideProvider(TODAY)
      .useValue(() => '2026-12-31')
      .compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    await app.init();
    http = request(app.getHttpServer());

    await app.get<Database>(DB).execute(sql`truncate table import_batches, expenses`);
    for (const [date, amount, description] of [
      ['2025-12-31', 10_000, 'нон'],
      ['2026-01-10', 400_000, 'Фильтр сув'],
      ['2026-03-05', 65_000, 'билайн'],
      ['2026-03-20', 5_000, 'нон'],
    ] as const) {
      await http.post('/api/v1/expenses').send({ date, amount, description }).expect(201);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('summary for a range', async () => {
    const { body } = await http
      .get('/api/v1/stats/summary?from=2026-01-01&to=2026-12-31')
      .expect(200);
    expect(body).toEqual({
      total: 470_000,
      count: 3,
      firstDate: '2026-01-10',
      lastDate: '2026-03-20',
      dailyAverage: Math.round(470_000 / 365),
    });
  });

  it('yearly totals', async () => {
    const { body } = await http.get('/api/v1/stats/timeseries?granularity=year').expect(200);
    expect(body).toEqual([
      { period: '2025', total: 10_000, count: 1 },
      { period: '2026', total: 470_000, count: 3 },
    ]);
  });

  it('monthly totals with the empty February filled in', async () => {
    const { body } = await http
      .get('/api/v1/stats/timeseries?granularity=month&from=2026-01-01&to=2026-03-31')
      .expect(200);
    expect(body).toEqual([
      { period: '2026-01', total: 400_000, count: 1 },
      { period: '2026-02', total: 0, count: 0 },
      { period: '2026-03', total: 70_000, count: 2 },
    ]);
  });

  it('daily series for one month has every day', async () => {
    const { body } = await http
      .get('/api/v1/stats/timeseries?granularity=day&from=2026-03-01&to=2026-03-31')
      .expect(200);
    expect(body).toHaveLength(31);
    expect(body[4]).toEqual({ period: '2026-03-05', total: 65_000, count: 1 });
  });

  it('top expenses, biggest first', async () => {
    const { body } = await http.get('/api/v1/stats/top?limit=2').expect(200);
    expect(body.map((e: { amount: number }) => e.amount)).toEqual([400_000, 65_000]);
  });

  it('validates input', async () => {
    await http.get('/api/v1/stats/timeseries?granularity=week').expect(400);
    await http.get('/api/v1/stats/top?limit=1000').expect(400);
  });
});
