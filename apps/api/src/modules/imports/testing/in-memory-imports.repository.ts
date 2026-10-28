import { randomUUID } from 'node:crypto';
import type { ImportBatchDto } from '@expenses/shared';
import type { FingerprintedExpense } from '../fingerprint.js';
import { ImportsRepository } from '../imports.repository.js';
import type { NewImportBatch } from '../imports.repository.js';

/** Fake repository for fast unit tests. */
export class InMemoryImportsRepository extends ImportsRepository {
  readonly batches: (ImportBatchDto & { userId: string })[] = [];
  readonly expenses: (FingerprintedExpense & { userId: string; batchId: string })[] = [];

  async findExistingHashes(userId: string, hashes: readonly string[]): Promise<Set<string>> {
    const mine = new Set(this.expenses.filter((e) => e.userId === userId).map((e) => e.dedupeHash));
    return new Set(hashes.filter((h) => mine.has(h)));
  }

  async saveBatch(
    userId: string,
    batch: NewImportBatch,
    rows: readonly FingerprintedExpense[],
  ): Promise<ImportBatchDto> {
    const id = randomUUID();
    const existing = await this.findExistingHashes(
      userId,
      rows.map((r) => r.dedupeHash),
    );
    const fresh = rows.filter((r) => !existing.has(r.dedupeHash));
    this.expenses.push(...fresh.map((r) => ({ ...r, userId, batchId: id })));
    const dto: ImportBatchDto = {
      id,
      fileName: batch.fileName,
      parserId: batch.parserId,
      summary: {
        ...batch.summary,
        new: fresh.length,
        duplicates: batch.summary.parsed - fresh.length,
      },
      createdAt: new Date().toISOString(),
    };
    this.batches.push({ ...dto, userId });
    return dto;
  }

  async listBatches(userId: string): Promise<ImportBatchDto[]> {
    return this.batches
      .filter((b) => b.userId === userId)
      .map(({ userId: _userId, ...dto }) => dto);
  }

  async deleteBatch(userId: string, id: string): Promise<boolean> {
    const index = this.batches.findIndex((b) => b.userId === userId && b.id === id);
    if (index === -1) return false;
    this.batches.splice(index, 1);
    for (let i = this.expenses.length - 1; i >= 0; i--) {
      if (this.expenses[i]?.batchId === id) this.expenses.splice(i, 1);
    }
    return true;
  }
}
