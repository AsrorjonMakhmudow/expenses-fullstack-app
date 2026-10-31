/**
 * Formatting for humans. Numbers are stored as whole so'm; these functions only DISPLAY them.
 * Grouping with spaces ("1 015 790") is how amounts are written in Uzbekistan.
 */

const somFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** 1015790 → "1 015 790 so'm" */
export function formatSom(amount: number): string {
  return `${somFormatter.format(amount)} so'm`;
}

/** Compact, for chart axes: 1 250 000 → "1.3M", 65 000 → "65K". */
export function formatSomShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${trim(amount / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trim(amount / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(amount / 1_000)}K`;
  return String(amount);
}

function trim(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10" → "Oct" */
export function monthLabel(period: string): string {
  return MONTHS[Number(period.slice(5, 7)) - 1] ?? period;
}

/** "2026-10-04" → "04.10.2026" — the same format you write in Telegram. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

/** Today in the user's time zone as "YYYY-MM-DD" (not UTC — late evening must stay "today"). */
export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
