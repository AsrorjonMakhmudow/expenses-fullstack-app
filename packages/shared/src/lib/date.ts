/**
 * A calendar day in ISO format, e.g. "2026-10-04".
 *
 * It is a "branded" string: TypeScript treats it as a different type from a plain string,
 * so you cannot accidentally pass "04.10.2026" where an IsoDate is expected.
 * The only way to get one is through functions that validate it (toIsoDate, parseDmyDate).
 */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

const DMY_DATE = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Years outside this range are almost certainly typos (e.g. 04.10.0226). */
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return false;
  // Date.UTC "overflows" invalid days (31.02 → 03.03), so we compare the parts back.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function toIsoDate(year: number, month: number, day: number): IsoDate | null {
  if (!isValidCalendarDate(year, month, day)) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}` as IsoDate;
}

/** "04.10.2026" or "4/10/2026" → "2026-10-04". Returns null if it is not a real date. */
export function parseDmyDate(text: string): IsoDate | null {
  const match = DMY_DATE.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return toIsoDate(Number(year), Number(month), Number(day));
}

/** "2026-10-04" or "2026-10-04T21:15:00" → "2026-10-04". Returns null if invalid. */
export function parseIsoDatePrefix(text: string): IsoDate | null {
  const match = ISO_DATE.exec(text.slice(0, 10));
  if (!match) return null;
  const [, year, month, day] = match;
  return toIsoDate(Number(year), Number(month), Number(day));
}
