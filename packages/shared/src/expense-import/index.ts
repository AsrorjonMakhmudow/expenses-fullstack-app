// Public API of the expense-import slice. Import from here, never from inner files.
export type {
  ExpenseSourceParser,
  ImportInput,
  InflateRaw,
  ParseIssue,
  ParseIssueCode,
  ParseIssueSeverity,
  ParseResult,
  ParsedExpense,
} from './model/types.js';
export { parseExpenseText } from './lib/parse-expense-text.js';
export type { ParseTextOptions } from './lib/parse-expense-text.js';
export { plainTextParser } from './parsers/plain-text.parser.js';
export { markdownParser } from './parsers/markdown.parser.js';
export { rtfParser } from './parsers/rtf.parser.js';
export { docxParser } from './parsers/docx.parser.js';
export { telegramJsonParser } from './parsers/telegram-json.parser.js';
export { expenseSourceParsers, findParser } from './parsers/registry.js';
