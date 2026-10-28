import type { IsoDate, ParsedExpense } from '@expenses/shared';
import { describe, expect, it } from 'vitest';
import { fingerprintExpenses } from './fingerprint.js';

const expense = (description: string, amount = 5_000, date = '2026-10-04'): ParsedExpense => ({
  date: date as IsoDate,
  amount,
  description,
  rawLine: `${amount} - ${description}`,
  lineNumber: 1,
});

describe('fingerprintExpenses', () => {
  it('is stable: same input → same fingerprints (that is what makes re-import safe)', () => {
    const input = [expense('нон'), expense('сут')];
    expect(fingerprintExpenses(input)).toEqual(fingerprintExpenses(input));
  });

  it('keeps two identical purchases on the same day apart', () => {
    const [first, second] = fingerprintExpenses([expense('нон'), expense('нон')]);
    expect(first?.dedupeHash).not.toBe(second?.dedupeHash);
  });

  it('ignores case and extra spaces in the description', () => {
    const [a] = fingerprintExpenses([expense('Нон  олдим ')]);
    const [b] = fingerprintExpenses([expense('нон олдим')]);
    expect(a?.dedupeHash).toBe(b?.dedupeHash);
  });

  it('differs when date or amount differs', () => {
    const hashes = fingerprintExpenses([
      expense('нон', 5_000, '2026-10-04'),
      expense('нон', 5_000, '2026-10-05'),
      expense('нон', 6_000, '2026-10-04'),
    ]).map((e) => e.dedupeHash);
    expect(new Set(hashes).size).toBe(3);
  });

  it('an overlapping bigger export reproduces the old fingerprints', () => {
    const october = [expense('нон'), expense('нон')];
    const octoberAndMore = [...october, expense('нон'), expense('сут', 1_000, '2026-10-05')];
    const oldHashes = fingerprintExpenses(october).map((e) => e.dedupeHash);
    const newHashes = fingerprintExpenses(octoberAndMore).map((e) => e.dedupeHash);
    expect(newHashes.slice(0, 2)).toEqual(oldHashes);
    expect(oldHashes).not.toContain(newHashes[2]); // the third bread is new
  });
});
