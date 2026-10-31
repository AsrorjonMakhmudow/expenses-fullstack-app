import type { IsoDate } from '../lib/date.js';
import type { Granularity, TimeseriesPointDto } from './stats.contract.js';

/**
 * Period helpers, shared so the server (filling gaps) and the web app (chart labels)
 * agree on exactly what "2026-10" means.
 */

/** "2026-10-04" → "2026" | "2026-10" | "2026-10-04" */
export function periodOf(date: IsoDate, granularity: Granularity): string {
  if (granularity === 'year') return date.slice(0, 4);
  if (granularity === 'month') return date.slice(0, 7);
  return date;
}

function nextPeriod(period: string, granularity: Granularity): string {
  if (granularity === 'year') return String(Number(period) + 1);
  if (granularity === 'month') {
    const [year = 0, month = 0] = period.split('-').map(Number);
    return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  }
  const next = new Date(`${period}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Every period from `first` to `last` inclusive: ["2026-01", "2026-02", …]. */
export function listPeriods(first: string, last: string, granularity: Granularity): string[] {
  const periods: string[] = [];
  for (let p = first; p <= last; p = nextPeriod(p, granularity)) periods.push(p);
  return periods;
}

/**
 * Charts need EVERY period, including ones with no spending — otherwise a month with
 * zero expenses silently disappears and the line jumps straight over it.
 */
export function fillGaps(
  points: readonly TimeseriesPointDto[],
  first: string,
  last: string,
  granularity: Granularity,
): TimeseriesPointDto[] {
  const byPeriod = new Map(points.map((p) => [p.period, p]));
  return listPeriods(first, last, granularity).map(
    (period) => byPeriod.get(period) ?? { period, total: 0, count: 0 },
  );
}

/** Calendar days between two dates, inclusive: (2026-10-01, 2026-10-31) → 31. */
export function daysInclusive(from: IsoDate, to: IsoDate): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
