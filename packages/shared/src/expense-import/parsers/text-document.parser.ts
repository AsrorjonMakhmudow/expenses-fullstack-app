import { issueMessage, parseExpenseText } from '../lib/parse-expense-text.js';
import type { ExpenseSourceParser, ImportInput } from '../model/types.js';

interface TextDocumentParserOptions {
  id: string;
  label: string;
  /** Lower case, with the dot: ['.md', '.markdown']. */
  extensions: readonly string[];
  /** Turns the file into plain note text. null = the file is broken or not this format. */
  toText: (input: ImportInput) => string | null;
}

/**
 * Every "document" format holds the same notes as a .txt file — only the wrapping differs.
 * So each parser is just: wrapping → plain text → the one shared note parser.
 *
 * Call sites mark it `/* @__PURE__ *\/` so bundlers can drop parsers the web app never uses.
 */
export function createTextDocumentParser(options: TextDocumentParserOptions): ExpenseSourceParser {
  const { id, label, extensions, toText } = options;
  return {
    id,
    label,
    extensions,
    canParse: ({ fileName }) => {
      const name = fileName.toLowerCase();
      return extensions.some((extension) => name.endsWith(extension));
    },
    parse: (input) => {
      const text = toText(input);
      if (text === null) {
        return {
          expenses: [],
          issues: [
            { severity: 'error', code: 'INVALID_FILE', message: issueMessage('INVALID_FILE') },
          ],
          skippedMessages: 0,
        };
      }
      const { expenses, issues } = parseExpenseText(text);
      return { expenses, issues, skippedMessages: 0 };
    },
  };
}
