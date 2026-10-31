import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../lib/date.js';
import { daysInclusive, fillGaps, listPeriods, periodOf } from './periods.js';

const d = (value: string) => value as IsoDate;

describe('periodOf', () => {
  it.each([
    ['year', '2026'],
    ['month', '2026-10'],
    ['day', '2026-10-04'],
  ] as const)('%s → %s', (granularity, expected) => {
    expect(periodOf(d('2026-10-04'), granularity)).toBe(expected);
  });
});

describe('listPeriods', () => {
  it('crosses the year boundary for months', () => {
    expect(listPeriods('2025-11', '2026-02', 'month')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('handles leap days', () => {
    expect(listPeriods('2024-02-28', '2024-03-01', 'day')).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
  });

  it('years', () => {
    expect(listPeriods('2024', '2026', 'year')).toEqual(['2024', '2025', '2026']);
  });
});

describe('fillGaps', () => {
  it('inserts zero points for empty periods, keeps real ones', () => {
    const points = [
      { period: '2026-01', total: 100, count: 1 },
      { period: '2026-03', total: 300, count: 2 },
    ];
    expect(fillGaps(points, '2026-01', '2026-03', 'month')).toEqual([
      { period: '2026-01', total: 100, count: 1 },
      { period: '2026-02', total: 0, count: 0 },
      { period: '2026-03', total: 300, count: 2 },
    ]);
  });
});

describe('daysInclusive', () => {
  it.each([
    ['2026-10-01', '2026-10-31', 31],
    ['2026-10-04', '2026-10-04', 1],
    ['2024-01-01', '2024-12-31', 366],
  ])('%s → %s = %d days', (from, to, expected) => {
    expect(daysInclusive(d(from), d(to))).toBe(expected);
  });
});
