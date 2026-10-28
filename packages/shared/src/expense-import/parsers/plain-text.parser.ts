import { parseExpenseText } from '../lib/parse-expense-text.js';
import type { ExpenseSourceParser } from '../model/types.js';

/** A .txt file, or text pasted/copied straight from Telegram. */
export const plainTextParser: ExpenseSourceParser = {
  id: 'plain-text',
  label: 'Plain text (.txt or pasted)',

  canParse: ({ fileName }) => /\.txt$/i.test(fileName),

  parse: ({ content }) => {
    const { expenses, issues } = parseExpenseText(content);
    return { expenses, issues, skippedMessages: 0 };
  },
};
