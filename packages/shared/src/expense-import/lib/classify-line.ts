import { parseDmyDate } from '../../lib/date.js';
import type { IsoDate } from '../../lib/date.js';
import { parseSomAmount } from '../../lib/money.js';

/**
 * Every line of a note is exactly ONE of these kinds.
 * This is a "discriminated union": the `kind` field tells TypeScript which other fields exist,
 * and `switch (line.kind)` forces us to handle every case.
 */
export type ClassifiedLine =
  | { kind: 'empty' }
  | { kind: 'date'; date: IsoDate }
  | { kind: 'invalid-date' }
  | { kind: 'expense'; amount: number; description: string }
  | { kind: 'invalid-amount' }
  | { kind: 'missing-description' }
  | { kind: 'unknown' };

// Invisible characters Telegram/phones sometimes insert (zero-width space, BOM, …).
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

// Something shaped like a date (so we can say "invalid date" instead of "unknown line").
const LOOKS_LIKE_DATE = /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/;

// "<amount> <dash> <description>". Accepts every dash a keyboard may produce: - ‐ ‑ ‒ – — ― −
const EXPENSE_LINE = /^(\d[\d.,\s\u00A0\u202F]*?)\s*[-‐‑‒–—―−]\s*(.*)$/u;

export function normalizeLine(raw: string): string {
  return raw.replace(INVISIBLE_CHARS, '').trim();
}

export function classifyLine(raw: string): ClassifiedLine {
  const line = normalizeLine(raw);
  if (line === '') return { kind: 'empty' };

  if (LOOKS_LIKE_DATE.test(line)) {
    const date = parseDmyDate(line);
    return date ? { kind: 'date', date } : { kind: 'invalid-date' };
  }

  const match = EXPENSE_LINE.exec(line);
  if (!match) return { kind: 'unknown' };

  const [, amountText = '', descriptionText = ''] = match;
  const amount = parseSomAmount(amountText);
  if (amount === null) return { kind: 'invalid-amount' };

  const description = descriptionText.replace(/\s+/g, ' ').trim();
  if (description === '') return { kind: 'missing-description' };

  return { kind: 'expense', amount, description };
}
