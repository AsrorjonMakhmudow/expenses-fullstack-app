import { daysInclusive, fillGaps, MAX_DAILY_POINTS, periodOf } from '@expenses/shared';
import type {
  IsoDate,
  StatsRange,
  StatsSummaryDto,
  TimeseriesPointDto,
  TimeseriesQuery,
  TopExpenseDto,
  TopExpensesQuery,
} from '@expenses/shared';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { StatsRepository } from './stats.repository.js';

/**
 * "What day is it?" is injected instead of called directly — so tests can freeze time.
 * Code that reads the clock directly can't be tested reliably (results change every day).
 */
export const TODAY = Symbol('TODAY');
export type Today = () => IsoDate;

/** Today's date in the server's time zone (set TZ=Asia/Tashkent in production). */
export function localToday(): IsoDate {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10) as IsoDate;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly repository: StatsRepository,
    @Inject(TODAY) private readonly today: Today,
  ) {}

  async summary(userId: string, range: StatsRange): Promise<StatsSummaryDto> {
    const raw = await this.repository.summary(userId, range);
    // Average over the requested range; without one, over the span of your data.
    // Never count future days: on 28 October, "2026" has 301 days so far, not 365.
    const from = range.from ?? raw.firstDate;
    const requestedTo = range.to ?? raw.lastDate;
    const today = this.today();
    const to = requestedTo && requestedTo > today ? today : requestedTo;
    const days = from && to && from <= to ? daysInclusive(from, to) : 0;
    return { ...raw, dailyAverage: days > 0 ? Math.round(raw.total / days) : 0 };
  }

  async timeseries(userId: string, query: TimeseriesQuery): Promise<TimeseriesPointDto[]> {
    const { granularity, ...range } = query;

    // Decide the period span first, so we can refuse a too-big daily series cheaply.
    const bounds =
      range.from && range.to
        ? { first: range.from, last: range.to }
        : await this.dataBounds(userId, range);
    if (!bounds) return [];

    if (granularity === 'day' && daysInclusive(bounds.first, bounds.last) > MAX_DAILY_POINTS) {
      throw new BadRequestException(
        `A daily series can cover at most ${MAX_DAILY_POINTS} days. Narrow "from"/"to".`,
      );
    }

    const points = await this.repository.timeseries(userId, range, granularity);
    return fillGaps(
      points,
      periodOf(bounds.first, granularity),
      periodOf(bounds.last, granularity),
      granularity,
    );
  }

  top(userId: string, query: TopExpensesQuery): Promise<TopExpenseDto[]> {
    const { limit, ...range } = query;
    return this.repository.top(userId, range, limit);
  }

  /** Missing from/to → use the first/last day that has data. */
  private async dataBounds(userId: string, range: StatsRange) {
    const { firstDate, lastDate } = await this.repository.summary(userId, range);
    const first = range.from ?? firstDate;
    const last = range.to ?? lastDate;
    return first && last ? { first, last } : null;
  }
}
