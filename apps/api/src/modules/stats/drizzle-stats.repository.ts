import type {
  Granularity,
  IsoDate,
  StatsRange,
  TimeseriesPointDto,
  TopExpenseDto,
} from '@expenses/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, max, min, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DB } from '../../infra/database/database.module.js';
import type { Database } from '../../infra/database/database.module.js';
import { expenses } from '../../infra/database/schema.js';
import { StatsRepository } from './stats.repository.js';
import type { RawSummary } from './stats.repository.js';

/**
 * PostgreSQL date formats per granularity.
 * These go into the SQL text with sql.raw — that is ONLY safe because they come from this
 * fixed list, never from user input. (User input always goes in as a parameter.)
 */
const PERIOD_FORMAT: Record<Granularity, string> = {
  year: 'YYYY',
  month: 'YYYY-MM',
  day: 'YYYY-MM-DD',
};

function rangeFilter(userId: string, range: StatsRange): SQL | undefined {
  const conditions: SQL[] = [eq(expenses.userId, userId)];
  if (range.from) conditions.push(gte(expenses.spentOn, range.from));
  if (range.to) conditions.push(lte(expenses.spentOn, range.to));
  return and(...conditions);
}

// SUM(bigint) returns NUMERIC and COUNT returns BIGINT; the pg driver gives both back as
// strings (to avoid precision loss). Our totals are far below 2^53, so Number is exact.
const sumAmount = sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number);

@Injectable()
export class DrizzleStatsRepository extends StatsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super();
  }

  async summary(userId: string, range: StatsRange): Promise<RawSummary> {
    const [row] = await this.db
      .select({
        total: sumAmount,
        count: count(),
        firstDate: min(expenses.spentOn),
        lastDate: max(expenses.spentOn),
      })
      .from(expenses)
      .where(rangeFilter(userId, range));

    return {
      total: row?.total ?? 0,
      count: row?.count ?? 0,
      firstDate: (row?.firstDate ?? null) as IsoDate | null,
      lastDate: (row?.lastDate ?? null) as IsoDate | null,
    };
  }

  async timeseries(
    userId: string,
    range: StatsRange,
    granularity: Granularity,
  ): Promise<TimeseriesPointDto[]> {
    //   SELECT to_char(spent_on, 'YYYY-MM') AS period, sum(amount), count(*)
    //   FROM expenses WHERE user_id = $1 AND spent_on BETWEEN … GROUP BY 1 ORDER BY 1
    const period = sql<string>`to_char(${expenses.spentOn}, '${sql.raw(PERIOD_FORMAT[granularity])}')`;
    return this.db
      .select({ period, total: sumAmount, count: count() })
      .from(expenses)
      .where(rangeFilter(userId, range))
      .groupBy(period)
      .orderBy(period);
  }

  async top(userId: string, range: StatsRange, limit: number): Promise<TopExpenseDto[]> {
    const rows = await this.db
      .select({
        id: expenses.id,
        date: expenses.spentOn,
        amount: expenses.amount,
        description: expenses.description,
      })
      .from(expenses)
      .where(rangeFilter(userId, range))
      .orderBy(desc(expenses.amount), desc(expenses.spentOn))
      .limit(limit);
    return rows.map((row) => ({ ...row, date: row.date as IsoDate }));
  }
}
