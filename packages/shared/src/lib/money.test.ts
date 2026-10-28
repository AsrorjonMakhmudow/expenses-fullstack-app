import { describe, expect, it } from 'vitest';
import { parseSomAmount } from './money.js';

describe('parseSomAmount', () => {
  it.each([
    ['65.000', 65_000],
    ['37.790', 37_790],
    ['1.250.000', 1_250_000],
    ['65 000', 65_000],
    ['65\u00A0000', 65_000], // non-breaking space (phones insert it)
    ['65,000', 65_000],
    ['65000', 65_000],
    ['500', 500],
  ])('parses %s → %d', (input, expected) => {
    expect(parseSomAmount(input)).toBe(expected);
  });

  it.each(['1.5', '65.00', '65.0000', '0', '', 'abc', '-5'])(
    'rejects ambiguous/invalid %j',
    (input) => {
      expect(parseSomAmount(input)).toBeNull();
    },
  );
});
