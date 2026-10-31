import type {
  Granularity,
  IsoDate,
  StatsRange,
  TimeseriesPointDto,
  TopExpenseDto,
} from '@expenses/shared';
import { periodOf } from '@expenses/shared';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { StatsService } from './stats.service.js';
import { StatsRepository } from './stats.repository.js';
import type { RawSummary } from './stats.repository.js';

const d = (value: string) => value as IsoDate;

/** Tiny fake that does in JavaScript what the real repository does in SQL. */
class FakeStatsRepository extends StatsRepository {
  constructor(private readonly rows: { date: IsoDate; amount: number }[]) {
    super();
  }

  private inRange(range: StatsRange) {
    return this.rows.filter(
      (r) => (!range.from || r.date >= range.from) && (!range.to || r.date <= range.to),
    );
  }

  async summary(_userId: string, range: StatsRange): Promise<RawSummary> {
    const rows = this.inRange(range);
    const dates = rows.map((r) => r.date).sort();
    return {
      total: rows.reduce((s, r) => s + r.amount, 0),
      count: rows.length,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
    };
  }

  async timeseries(_userId: string, range: StatsRange, granularity: Granularity) {
    const map = new Map<string, TimeseriesPointDto>();
    for (const r of this.inRange(range)) {
      const period = periodOf(r.date, granularity);
      const point = map.get(period) ?? { period, total: 0, count: 0 };
      point.total += r.amount;
      point.count += 1;
      map.set(period, point);
    }
    return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  async top(): Promise<TopExpenseDto[]> {
    return [];
  }
}

const today = () => d('2026-03-31');

const service = new StatsService(
  new FakeStatsRepository([
    { date: d('2026-01-10'), amount: 100_000 },
    { date: d('2026-03-05'), amount: 50_000 },
    { date: d('2026-03-20'), amount: 50_000 },
  ]),
  today,
);

describe('StatsService', () => {
  it('summary: total, count and daily average over the data span', async () => {
    // 2026-01-10 … 2026-03-20 = 70 days → 200 000 / 70 = 2 857
    expect(await service.summary('me', {})).toEqual({
      total: 200_000,
      count: 3,
      firstDate: '2026-01-10',
      lastDate: '2026-03-20',
      dailyAverage: 2_857,
    });
  });

  it('summary: averages over the REQUESTED range when given', async () => {
    const result = await service.summary('me', { from: d('2026-03-01'), to: d('2026-03-31') });
    expect(result).toMatchObject({ total: 100_000, dailyAverage: Math.round(100_000 / 31) });
  });

  it('summary: does not count future days (today is frozen to 2026-03-31)', async () => {
    // 2026-01-01 … 2026-03-31 = 90 days so far, even though we asked for the whole year.
    const result = await service.summary('me', { from: d('2026-01-01'), to: d('2026-12-31') });
    expect(result.dailyAverage).toBe(Math.round(200_000 / 90));
  });

  it('timeseries fills months without spending with zero', async () => {
    const points = await service.timeseries('me', { granularity: 'month' });
    expect(points).toEqual([
      { period: '2026-01', total: 100_000, count: 1 },
      { period: '2026-02', total: 0, count: 0 },
      { period: '2026-03', total: 100_000, count: 2 },
    ]);
  });

  it('timeseries for an empty account is empty', async () => {
    const empty = new StatsService(new FakeStatsRepository([]), today);
    expect(await empty.timeseries('me', { granularity: 'year' })).toEqual([]);
  });

  it('refuses a daily series that is too long', async () => {
    await expect(
      service.timeseries('me', { granularity: 'day', from: d('2020-01-01'), to: d('2026-01-01') }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
