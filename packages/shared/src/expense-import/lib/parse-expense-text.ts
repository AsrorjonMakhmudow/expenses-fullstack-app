import type { IsoDate } from '../../lib/date.js';
import type { ParseIssue, ParseIssueCode, ParsedExpense } from '../model/types.js';
import { assertNever } from '../../lib/assert-never.js';
import { classifyLine, normalizeLine } from './classify-line.js';

export interface ParseTextOptions {
  /**
   * Used when an expense line appears before any date line
   * (for Telegram: the message's own timestamp). Produces one warning per message.
   */
  fallbackDate?: IsoDate;
  sourceMessageId?: number;
}

export interface TextParseResult {
  expenses: ParsedExpense[];
  issues: ParseIssue[];
  /** true if at least one line was a date or an expense (or an attempt at one). */
  looksLikeExpenseNote: boolean;
}

const MESSAGES: Record<ParseIssueCode, string> = {
  INVALID_FILE: 'The file could not be read.',
  INVALID_DATE: 'This looks like a date, but it is not a real calendar date.',
  INVALID_AMOUNT: "The amount is not a whole number of so'm (example: 65.000).",
  MISSING_DESCRIPTION: 'The amount has no description after the dash.',
  EXPENSE_BEFORE_DATE: 'Expense line has no date above it.',
  UNRECOGNIZED_LINE: 'Line is neither a date nor "amount - description".',
  DATE_FROM_MESSAGE: 'No date line found; used the Telegram message date instead.',
};

export function issueMessage(code: ParseIssueCode): string {
  return MESSAGES[code];
}

/**
 * Parses notes written as:
 *
 *   04.10.2026
 *   65.000 - билайн номеримга ташадим
 *   150.000 — ...
 *
 * A date line applies to all expense lines below it, until the next date line.
 * Pure function: no I/O, no database — trivial to test and reusable in browser and server.
 */
export function parseExpenseText(text: string, options: ParseTextOptions = {}): TextParseResult {
  const { fallbackDate, sourceMessageId } = options;
  const expenses: ParsedExpense[] = [];
  const issues: ParseIssue[] = [];
  let currentDate: IsoDate | null = null;
  let usedFallbackDate = false;
  let looksLikeExpenseNote = false;

  const lines = text.split(/\r\n|\r|\n/);

  lines.forEach((raw, index) => {
    const line = classifyLine(raw);
    const where = {
      rawLine: normalizeLine(raw),
      lineNumber: index + 1,
      ...(sourceMessageId !== undefined && { sourceMessageId }),
    };
    const report = (severity: ParseIssue['severity'], code: ParseIssueCode) =>
      issues.push({ severity, code, message: MESSAGES[code], ...where });

    switch (line.kind) {
      case 'empty':
        return;

      case 'date':
        looksLikeExpenseNote = true;
        currentDate = line.date;
        return;

      case 'invalid-date':
        looksLikeExpenseNote = true;
        // Forget the previous date: attaching the next lines to the WRONG day is worse than
        // reporting them. They fall back to the message date or become errors.
        currentDate = null;
        report('error', 'INVALID_DATE');
        return;

      case 'invalid-amount':
        looksLikeExpenseNote = true;
        report('error', 'INVALID_AMOUNT');
        return;

      case 'missing-description':
        looksLikeExpenseNote = true;
        report('error', 'MISSING_DESCRIPTION');
        return;

      case 'unknown':
        report('error', 'UNRECOGNIZED_LINE');
        return;

      case 'expense': {
        looksLikeExpenseNote = true;
        let date = currentDate;
        if (date === null && fallbackDate !== undefined) {
          date = fallbackDate;
          if (!usedFallbackDate) report('warning', 'DATE_FROM_MESSAGE');
          usedFallbackDate = true;
        }
        if (date === null) {
          report('error', 'EXPENSE_BEFORE_DATE');
          return;
        }
        expenses.push({ date, amount: line.amount, description: line.description, ...where });
        return;
      }

      default:
        // Every kind is handled above; a new, unhandled kind would fail to compile here.
        return assertNever(line);
    }
  });

  return { expenses, issues, looksLikeExpenseNote };
}
