import { describe, expect, it } from 'vitest';
import { parseDmyDate, parseIsoDatePrefix } from './date.js';

describe('parseDmyDate', () => {
  it.each([
    ['04.10.2026', '2026-10-04'],
    ['4.10.2026', '2026-10-04'],
    ['4/1/2025', '2025-01-04'],
    [' 29.02.2024 ', '2024-02-29'], // leap year
  ])('parses %s → %s', (input, expected) => {
    expect(parseDmyDate(input)).toBe(expected);
  });

  it.each([
    '31.02.2026',
    '29.02.2025',
    '00.10.2026',
    '04.13.2026',
    '04.10.0226',
    '04.10.26',
    'abc',
  ])('rejects %s', (input) => {
    expect(parseDmyDate(input)).toBeNull();
  });
});

describe('parseIsoDatePrefix', () => {
  it('takes the day from a Telegram timestamp', () => {
    expect(parseIsoDatePrefix('2026-10-04T21:15:00')).toBe('2026-10-04');
  });

  it('rejects garbage', () => {
    expect(parseIsoDatePrefix('yesterday')).toBeNull();
  });
});
