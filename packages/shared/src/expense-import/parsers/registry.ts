import type { ExpenseSourceParser, ImportInput } from '../model/types.js';
import { docxParser } from './docx.parser.js';
import { markdownParser } from './markdown.parser.js';
import { plainTextParser } from './plain-text.parser.js';
import { rtfParser } from './rtf.parser.js';
import { telegramJsonParser } from './telegram-json.parser.js';

/**
 * All supported sources. To add a new one (e.g. Excel): create `excel.parser.ts`
 * implementing ExpenseSourceParser and add it to this list — nothing else changes.
 * To remove one: delete its file and its line here.
 */
export const expenseSourceParsers: readonly ExpenseSourceParser[] = [
  telegramJsonParser,
  plainTextParser,
  markdownParser,
  rtfParser,
  docxParser,
];

export function findParser(
  input: ImportInput,
  parsers: readonly ExpenseSourceParser[] = expenseSourceParsers,
): ExpenseSourceParser | null {
  return parsers.find((parser) => parser.canParse(input)) ?? null;
}
