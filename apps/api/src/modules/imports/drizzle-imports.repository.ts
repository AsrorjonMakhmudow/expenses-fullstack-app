import type { ImportBatchDto } from '@expenses/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DB } from '../../infra/database/database.module.js';
import type { Database } from '../../infra/database/database.module.js';
import { expenses, importBatches } from '../../infra/database/schema.js';
import type { FingerprintedExpense } from './fingerprint.js';
import { ImportsRepository } from './imports.repository.js';
import type { NewImportBatch } from './imports.repository.js';

type BatchRow = typeof importBatches.$inferSelect;

/** PostgreSQL limits parameters per query (65 535); 500 rows × 9 columns stays far below. */
const CHUNK_SIZE = 500;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function toDto(row: BatchRow): ImportBatchDto {
  return {
    id: row.id,
    fileName: row.fileName,
    parserId: row.parserId,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Trade-off note: this repository writes to the `expenses` table, which "belongs" to the
 * expenses module. We accept that because the batch and its expenses must be saved in ONE
 * transaction — consistency beats perfect module purity here. Documented in ADR 0006.
 */
@Injectable()
export class DrizzleImportsRepository extends ImportsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super();
  }

  async findExistingHashes(userId: string, hashes: readonly string[]): Promise<Set<string>> {
    const existing = new Set<string>();
    for (const part of chunk(hashes, 1_000)) {
      const rows = await this.db
        .select({ hash: expenses.dedupeHash })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), inArray(expenses.dedupeHash, part)));
      for (const row of rows) if (row.hash) existing.add(row.hash);
    }
    return existing;
  }

  async saveBatch(
    userId: string,
    batch: NewImportBatch,
    rows: readonly FingerprintedExpense[],
  ): Promise<ImportBatchDto> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(importBatches)
        .values({
          userId,
          fileName: batch.fileName,
          fileSha256: batch.fileSha256,
          parserId: batch.parserId,
          parsedCount: batch.summary.parsed,
          importedCount: 0,
          duplicateCount: 0,
          summary: batch.summary,
          issues: batch.issues,
        })
        .returning();
      if (!created) throw new Error('Insert returned no batch');

      let inserted = 0;
      for (const part of chunk(rows, CHUNK_SIZE)) {
        const result = await tx
          .insert(expenses)
          .values(
            part.map((row) => ({
              userId,
              spentOn: row.date,
              amount: row.amount,
              description: row.description,
              source: batch.source,
              rawLine: row.rawLine,
              dedupeHash: row.dedupeHash,
              importBatchId: created.id,
            })),
          )
          // A row with the same (user, fingerprint) already exists → skip it silently.
          .onConflictDoNothing({ target: [expenses.userId, expenses.dedupeHash] })
          .returning({ id: expenses.id });
        inserted += result.length;
      }

      // Final, exact numbers (another upload may have raced us between preview and now).
      const summary = {
        ...batch.summary,
        new: inserted,
        duplicates: batch.summary.parsed - inserted,
      };
      const [updated] = await tx
        .update(importBatches)
        .set({ importedCount: inserted, duplicateCount: summary.duplicates, summary })
        .where(eq(importBatches.id, created.id))
        .returning();
      if (!updated) throw new Error('Batch disappeared during import');
      return toDto(updated);
    });
  }

  async listBatches(userId: string): Promise<ImportBatchDto[]> {
    const rows = await this.db
      .select()
      .from(importBatches)
      .where(eq(importBatches.userId, userId))
      .orderBy(desc(importBatches.createdAt));
    return rows.map(toDto);
  }

  async deleteBatch(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(importBatches)
      .where(and(eq(importBatches.userId, userId), eq(importBatches.id, id)))
      .returning({ id: importBatches.id });
    return deleted.length > 0;
  }
}
