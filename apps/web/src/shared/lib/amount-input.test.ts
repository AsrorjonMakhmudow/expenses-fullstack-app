import { describe, expect, it } from 'vitest';
import { deleteAcrossSeparator, formatAmountInput, groupThousands } from './amount-input';

/** "1 2|50 000" → { raw: '1 250 000', caret: 4 } — the | marks the cursor. */
const at = (withCursor: string) => ({
  raw: withCursor.replace('|', ''),
  caret: withCursor.indexOf('|'),
});
const show = ({ text, caret }: { text: string; caret: number }) =>
  `${text.slice(0, caret)}|${text.slice(caret)}`;
const type = (withCursor: string) => {
  const { raw, caret } = at(withCursor);
  return show(formatAmountInput(raw, caret));
};

describe('groupThousands', () => {
  it.each([
    ['', ''],
    ['5', '5'],
    ['650', '650'],
    ['6500', '6 500'],
    ['65000', '65 000'],
    ['1250000', '1 250 000'],
  ])('%s → "%s"', (digits, expected) => {
    expect(groupThousands(digits)).toBe(expected);
  });
});

describe('formatAmountInput', () => {
  it('groups while typing at the end', () => {
    expect(type('6500|')).toBe('6 500|');
    expect(type('65 0000|')).toBe('650 000|');
    expect(type('650 0000|')).toBe('6 500 000|');
  });

  it('keeps the cursor after the same digit when typing in the middle', () => {
    // "1 2|50 000", type 9 → "1 29|50 000" → regrouped "12 9|50 000"
    expect(type('1 29|50 000')).toBe('12 9|50 000');
    // "|1 250", type 9 at the start → "91 250", cursor after the 9
    expect(type('9|1 250')).toBe('9|1 250');
  });

  it('cleans pasted text: Telegram dots, "so\'m", spaces', () => {
    expect(formatAmountInput('65.000').digits).toBe('65000');
    expect(formatAmountInput("1.250.000 so'm").text).toBe('1 250 000');
    expect(formatAmountInput('  700 000 ').text).toBe('700 000');
  });

  it('drops leading zeros and letters, keeping the cursor sensible', () => {
    expect(type('0|')).toBe('|');
    expect(type('005|')).toBe('5|');
    expect(type('6a|5')).toBe('6|5');
  });

  it(`stops at 15 digits so the number stays exact`, () => {
    expect(formatAmountInput('9'.repeat(20)).digits).toHaveLength(15);
    expect(Number.isSafeInteger(Number(formatAmountInput('9'.repeat(20)).digits))).toBe(true);
  });
});

describe('deleteAcrossSeparator', () => {
  const press = (withCursor: string, key: 'Backspace' | 'Delete') => {
    const { raw, caret } = at(withCursor);
    const next = deleteAcrossSeparator(raw, caret, key);
    return next && show(next);
  };

  it('Backspace right after a space removes the digit before it', () => {
    expect(press('1 250 |000', 'Backspace')).toBe('125| 000');
    expect(press('65 |000', 'Backspace')).toBe('6| 000');
  });

  it('Delete right before a space removes the digit after it', () => {
    expect(press('1| 250 000', 'Delete')).toBe('1|50 000');
  });

  it('anywhere else → null (the browser deletes normally)', () => {
    expect(press('1 25|0 000', 'Backspace')).toBeNull();
    expect(press('1 2|50 000', 'Delete')).toBeNull();
    expect(press('|1 250', 'Backspace')).toBeNull();
  });
});
