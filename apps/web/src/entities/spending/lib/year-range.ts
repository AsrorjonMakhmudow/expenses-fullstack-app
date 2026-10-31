import type { IsoDate, StatsRange } from '@expenses/shared';

/** 2026 → { from: "2026-01-01", to: "2026-12-31" } */
export function yearRange(year: number): Required<StatsRange> {
  return { from: `${year}-01-01` as IsoDate, to: `${year}-12-31` as IsoDate };
}
