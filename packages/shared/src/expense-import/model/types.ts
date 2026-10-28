import type { IsoDate } from '../../lib/date.js';

/** One expense found in the source text. Not saved anywhere yet — just "understood". */
export interface ParsedExpense {
  date: IsoDate;
  /** Whole so'm: "65.000" → 65000. */
  amount: number;
  description: string;
  /** The original line exactly as written (trimmed). Kept for audit and debugging. */
  rawLine: string;
  /** 1-based line number inside its message (Telegram) or file (plain text). */
  lineNumber: number;
  /** Telegram message id, when the source is a Telegram export. */
  sourceMessageId?: number;
}

export type ParseIssueCode =
  | 'INVALID_FILE'
  | 'INVALID_DATE'
  | 'INVALID_AMOUNT'
  | 'MISSING_DESCRIPTION'
  | 'EXPENSE_BEFORE_DATE'
  | 'UNRECOGNIZED_LINE'
  | 'DATE_FROM_MESSAGE';

/**
 * error   → the line was NOT imported.
 * warning → the line WAS imported, but we made an assumption you should check.
 */
export type ParseIssueSeverity = 'error' | 'warning';

export interface ParseIssue {
  severity: ParseIssueSeverity;
  /** Stable code: the UI can translate it (RU/UZ/EN) without parsing the message text. */
  code: ParseIssueCode;
  message: string;
  rawLine?: string;
  lineNumber?: number;
  sourceMessageId?: number;
}

export interface ParseResult {
  expenses: ParsedExpense[];
  issues: ParseIssue[];
  /** Telegram messages ignored because they are not expense notes (links, photos, other notes). */
  skippedMessages: number;
}

/** What the user uploaded or pasted. */
export interface ImportInput {
  fileName: string;
  content: string;
}

/**
 * Extension point (Strategy pattern, Open/Closed principle).
 * A new source (Excel, CSV, Telegram bot…) = a new object implementing this interface,
 * added to the registry. Existing parsers and the import service stay untouched.
 *
 * Note: `content` is text for now. When we add Excel (binary), we widen ImportInput then —
 * not earlier (YAGNI).
 */
export interface ExpenseSourceParser {
  /** Stable id stored with each import batch, e.g. "telegram-json". */
  readonly id: string;
  /** Human-readable name for the UI. */
  readonly label: string;
  canParse(input: ImportInput): boolean;
  parse(input: ImportInput): ParseResult;
}
