import { z } from 'zod';
import type { IsoDate } from '../lib/date.js';
import { IsoDateSchema } from '../expense/expense.contract.js';

/*
 * API contract for statistics (Phase 5) — the data behind the dashboard charts.
 *
 *   GET /api/v1/stats/summary?from=&to=                        → StatsSummaryDto
 *   GET /api/v1/stats/timeseries?granularity=month&from=&to=   → TimeseriesPointDto[]
 *   GET /api/v1/stats/top?from=&to=&limit=10                   → TopExpenseDto[]
 *
 * `from` / `to` are optional and inclusive. Without them: all your data.
 */

const fromBeforeTo = (query: { from?: IsoDate | undefined; to?: IsoDate | undefined }) =>
  !query.from || !query.to || query.from <= query.to;
const fromBeforeToError = { message: '"from" must be before or equal to "to"', path: ['from'] };

export const StatsRangeSchema = z
  .object({ from: IsoDateSchema.optional(), to: IsoDateSchema.optional() })
  .refine(fromBeforeTo, fromBeforeToError);
export type StatsRange = z.output<typeof StatsRangeSchema>;

export const GRANULARITIES = ['year', 'month', 'day'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

/** A daily series is capped so one request can't ask for 50 years of days. */
export const MAX_DAILY_POINTS = 400;

export const TimeseriesQuerySchema = z
  .object({
    granularity: z.enum(GRANULARITIES),
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
  })
  .refine(fromBeforeTo, fromBeforeToError);
export type TimeseriesQuery = z.output<typeof TimeseriesQuerySchema>;

export const TopExpensesQuerySchema = z
  .object({
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine(fromBeforeTo, fromBeforeToError);
export type TopExpensesQuery = z.output<typeof TopExpensesQuerySchema>;

export interface StatsSummaryDto {
  /** Sum in so'm. */
  total: number;
  count: number;
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
  /** total ÷ number of calendar days in the range (whole so'm). */
  dailyAverage: number;
}

export interface TimeseriesPointDto {
  /** "2026" (year), "2026-10" (month) or "2026-10-04" (day). Sorted, gaps filled with 0. */
  period: string;
  total: number;
  count: number;
}

export interface TopExpenseDto {
  id: string;
  date: IsoDate;
  amount: number;
  description: string;
}
