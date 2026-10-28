import type { ExpenseSource, ImportBatchDto, ImportSummaryDto, ParseIssue } from '@expenses/shared';
import type { FingerprintedExpense } from './fingerprint.js';

export interface NewImportBatch {
  fileName: string;
  fileSha256: string;
  parserId: string;
  source: ExpenseSource;
  summary: ImportSummaryDto;
  issues: ParseIssue[];
}

/** Storage operations the import feature needs (see ExpensesRepository for why abstract). */
export abstract class ImportsRepository {
  /** Which of these fingerprints already exist for this user? */
  abstract findExistingHashes(userId: string, hashes: readonly string[]): Promise<Set<string>>;

  /**
   * Saves the batch and its expenses in ONE transaction: either everything is saved or
   * nothing is. Rows whose fingerprint already exists are skipped (safe even if two
   * uploads of the same file race each other).
   */
  abstract saveBatch(
    userId: string,
    batch: NewImportBatch,
    expenses: readonly FingerprintedExpense[],
  ): Promise<ImportBatchDto>;

  abstract listBatches(userId: string): Promise<ImportBatchDto[]>;

  /** Undo: deletes the batch and (by cascade) every expense it created. */
  abstract deleteBatch(userId: string, id: string): Promise<boolean>;
}
