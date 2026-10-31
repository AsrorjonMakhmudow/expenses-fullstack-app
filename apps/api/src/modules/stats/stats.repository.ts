import type {
  Granularity,
  IsoDate,
  StatsRange,
  TimeseriesPointDto,
  TopExpenseDto,
} from '@expenses/shared';

export interface RawSummary {
  total: number;
  count: number;
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
}

/** Read-only aggregate queries. The database does the math (SUM/COUNT/GROUP BY) — fast. */
export abstract class StatsRepository {
  abstract summary(userId: string, range: StatsRange): Promise<RawSummary>;
  /** Only periods that HAVE expenses, sorted. Gaps are filled by the service. */
  abstract timeseries(
    userId: string,
    range: StatsRange,
    granularity: Granularity,
  ): Promise<TimeseriesPointDto[]>;
  abstract top(userId: string, range: StatsRange, limit: number): Promise<TopExpenseDto[]>;
}
