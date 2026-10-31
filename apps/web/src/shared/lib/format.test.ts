import { describe, expect, it } from 'vitest';
import { formatDate, formatSom, formatSomShort, monthLabel, todayIso } from './format';

// Intl uses a non-breaking space between thousand groups — normalize for readable assertions.
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('format', () => {
  it('formatSom groups thousands', () => {
    expect(plain(formatSom(1_015_790))).toBe("1 015 790 so'm");
  });

  it.each([
    [65_000, '65K'],
    [1_250_000, '1.3M'],
    [2_000_000, '2M'],
    [3_500_000_000, '3.5B'],
    [500, '500'],
  ])('formatSomShort(%d) → %s', (amount, expected) => {
    expect(formatSomShort(amount)).toBe(expected);
  });

  it('monthLabel and formatDate', () => {
    expect(monthLabel('2026-10')).toBe('Oct');
    expect(formatDate('2026-10-04')).toBe('04.10.2026');
  });

  it('todayIso returns a YYYY-MM-DD string', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
