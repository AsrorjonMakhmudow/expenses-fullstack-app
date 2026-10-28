import type { ExpenseSourceParser, ImportInput } from '../model/types.js';
import { plainTextParser } from './plain-text.parser.js';
import { telegramJsonParser } from './telegram-json.parser.js';

/**
 * All supported sources. To add a new one (e.g. Excel): create `excel.parser.ts`
 * implementing ExpenseSourceParser and add it to this list — nothing else changes.
 * To remove one: delete its file and its line here.
 */
export const expenseSourceParsers: readonly ExpenseSourceParser[] = [
  telegramJsonParser,
  plainTextParser,
];

export function findParser(
  input: ImportInput,
  parsers: readonly ExpenseSourceParser[] = expenseSourceParsers,
): ExpenseSourceParser | null {
  return parsers.find((parser) => parser.canParse(input)) ?? null;
}
