import type { IsoDate } from '../lib/date.js';
import type { ParseIssue } from '../expense-import/index.js';

/*
 * API contract for importing expense history (Phase 4).
 *
 *   POST   /api/v1/imports/preview   multipart "file" → ImportPreviewDto   (nothing is saved)
 *   POST   /api/v1/imports           multipart "file" → ImportBatchDto     (saved in ONE transaction)
 *   GET    /api/v1/imports                            → ImportBatchDto[]
 *   DELETE /api/v1/imports/:id                        → 204 (undo: removes that import's expenses)
 */

export interface ImportPreviewExpenseDto {
  date: IsoDate;
  amount: number;
  description: string;
  rawLine: string;
  lineNumber: number;
  sourceMessageId?: number;
  /** Already in the database from an earlier import → will be skipped. */
  duplicate: boolean;
}

export interface ImportSummaryDto {
  /** Expenses the parser understood. */
  parsed: number;
  /** Of those, how many are new (would be / were saved). */
  new: number;
  /** Of those, how many were already imported before (skipped). */
  duplicates: number;
  errors: number;
  warnings: number;
  skippedMessages: number;
  /** Sum of NEW expenses only, in so'm. */
  newAmount: number;
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
}

export interface ImportPreviewDto {
  fileName: string;
  parser: { id: string; label: string };
  summary: ImportSummaryDto;
  issues: ParseIssue[];
  expenses: ImportPreviewExpenseDto[];
}

export interface ImportBatchDto {
  id: string;
  fileName: string;
  parserId: string;
  summary: ImportSummaryDto;
  createdAt: string;
}

/** Upload limit, shared so the web app can check BEFORE uploading (UX), and the API enforces it (security). */
export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;
