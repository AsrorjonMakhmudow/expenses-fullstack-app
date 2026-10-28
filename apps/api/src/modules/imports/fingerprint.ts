import { createHash } from 'node:crypto';
import type { ParsedExpense } from '@expenses/shared';

export type FingerprintedExpense = ParsedExpense & { dedupeHash: string };

/** "  Нон   олдим " and "нон олдим" are the same purchase. */
function normalizeDescription(description: string): string {
  return description.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Gives every parsed expense a stable fingerprint, so importing the same history twice
 * (or a bigger export that overlaps an old one) never creates duplicates.
 *
 * The tricky part: two breads on the same day ARE two real expenses, so
 * "same date + amount + text" is not enough. We also count the occurrence:
 *
 *   04.10  5.000 - нон   → (2026-10-04, 5000, "нон", #1)
 *   04.10  5.000 - нон   → (2026-10-04, 5000, "нон", #2)   ← different fingerprint ✔
 *
 * Re-importing produces the same #1 and #2 → both recognised as already imported.
 * If you later add a third bread to that day, it becomes #3 → new ✔
 */
export function fingerprintExpenses(expenses: readonly ParsedExpense[]): FingerprintedExpense[] {
  const seen = new Map<string, number>();

  return expenses.map((expense) => {
    const identity = JSON.stringify([
      expense.date,
      expense.amount,
      normalizeDescription(expense.description),
    ]);
    const occurrence = (seen.get(identity) ?? 0) + 1;
    seen.set(identity, occurrence);

    const dedupeHash = createHash('sha256').update(`${identity}#${occurrence}`).digest('hex');
    return { ...expense, dedupeHash };
  });
}
