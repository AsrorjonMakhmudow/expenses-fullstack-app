/**
 * Amounts are stored as WHOLE so'm in a plain number (65.000 → 65000).
 * Never use floats for money: 0.1 + 0.2 === 0.30000000000000004 in JavaScript.
 * Number.MAX_SAFE_INTEGER (~9 quadrillion) is far more than we will ever need.
 */

// Either "65000" (plain digits) or groups of three separated by . , or spaces: "1.250.000", "65 000".
// "1.5" or "65.00" do NOT match on purpose: they are ambiguous, so we report them instead of guessing.
const SOM_AMOUNT = /^(?:\d{1,3}(?:[.,\s\u00A0\u202F]\d{3})+|\d+)$/;

export function parseSomAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!SOM_AMOUNT.test(trimmed)) return null;
  const value = Number(trimmed.replace(/\D/g, ''));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
