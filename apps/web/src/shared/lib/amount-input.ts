/**
 * Live thousands grouping for an amount field: typing "1250000" shows "1 250 000".
 * Pure functions (no React) so the tricky part — where the cursor goes — is easy to test.
 */

/** Regular space, the same grouping formatSom shows ("1 250 000"); parseSomAmount accepts it. */
export const AMOUNT_GROUP_SEPARATOR = ' ';

/** 15 digits (< 1 quadrillion) always fits a safe integer — no silent rounding. */
export const MAX_AMOUNT_DIGITS = 15;

/** "1250000" → "1 250 000" */
export function groupThousands(digits: string, separator = AMOUNT_GROUP_SEPARATOR): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export interface AmountInputState {
  /** Only digits, no leading zeros: what the form keeps and parses. */
  digits: string;
  /** What the field shows. */
  text: string;
  /** Where the cursor goes in `text`. */
  caret: number;
}

/**
 * Normalizes whatever is now in the field (typed, pasted "65.000", "65 000 so'm" …).
 * The cursor stays after the same number of digits it was after, so typing in the middle
 * of "1 250 000" doesn't throw it to the end.
 */
export function formatAmountInput(raw: string, caret = raw.length): AmountInputState {
  const allDigits = raw.replace(/\D/g, '');
  const withoutLeadingZeros = allDigits.replace(/^0+/, '');
  const digits = withoutLeadingZeros.slice(0, MAX_AMOUNT_DIGITS);

  const leadingZeros = allDigits.length - withoutLeadingZeros.length;
  const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;
  const caretDigits = Math.min(Math.max(digitsBeforeCaret - leadingZeros, 0), digits.length);

  const text = groupThousands(digits);
  return { digits, text, caret: caretAfterDigits(text, caretDigits) };
}

/**
 * Backspace/Delete right next to a separator would only remove the space (which comes straight
 * back). Instead remove the digit on the other side of it. Returns null → let the browser do it.
 */
export function deleteAcrossSeparator(
  text: string,
  caret: number,
  key: 'Backspace' | 'Delete',
): AmountInputState | null {
  if (key === 'Backspace' && caret >= 2 && text[caret - 1] === AMOUNT_GROUP_SEPARATOR) {
    return formatAmountInput(text.slice(0, caret - 2) + text.slice(caret), caret - 2);
  }
  if (key === 'Delete' && text[caret] === AMOUNT_GROUP_SEPARATOR) {
    return formatAmountInput(text.slice(0, caret + 1) + text.slice(caret + 2), caret);
  }
  return null;
}

/** Position in `text` right after its n-th digit. */
function caretAfterDigits(text: string, n: number): number {
  if (n === 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]!) && ++seen === n) return i + 1;
  }
  return text.length;
}
