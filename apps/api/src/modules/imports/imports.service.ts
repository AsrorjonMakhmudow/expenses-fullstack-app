import { createHash } from 'node:crypto';
import { expenseSourceParsers, findParser } from '@expenses/shared';
import type {
  ExpenseSource,
  ExpenseSourceParser,
  ImportBatchDto,
  ImportPreviewDto,
  ImportSummaryDto,
  ParseIssue,
  ParseResult,
} from '@expenses/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fingerprintExpenses } from './fingerprint.js';
import type { FingerprintedExpense } from './fingerprint.js';
import { ImportsRepository } from './imports.repository.js';

export interface UploadedImportFile {
  originalname: string;
  buffer: Buffer;
}

/** Which `expenses.source` value each parser produces. New parser → one new line here. */
const SOURCE_BY_PARSER: Record<string, ExpenseSource> = {
  'telegram-json': 'telegram_import',
  'plain-text': 'plain_text_import',
};

interface Analysis {
  fileName: string;
  fileSha256: string;
  parser: ExpenseSourceParser;
  result: ParseResult;
  expenses: FingerprintedExpense[];
  existing: Set<string>;
  summary: ImportSummaryDto;
}

/**
 * Import flow (two steps, on purpose):
 *   1. preview → parse + compare with the database, save NOTHING, show the user the result
 *   2. commit  → the user uploads the same file again; we parse it AGAIN on the server
 *
 * Why parse twice instead of trusting the preview? The server never trusts data the client
 * sends back — it only trusts the original file. And no temporary state to store or expire.
 */
@Injectable()
export class ImportsService {
  constructor(private readonly repository: ImportsRepository) {}

  async preview(userId: string, file: UploadedImportFile | undefined): Promise<ImportPreviewDto> {
    const analysis = await this.analyse(userId, file);
    return {
      fileName: analysis.fileName,
      parser: { id: analysis.parser.id, label: analysis.parser.label },
      summary: analysis.summary,
      issues: analysis.result.issues,
      expenses: analysis.expenses.map(({ dedupeHash, ...expense }) => ({
        ...expense,
        duplicate: analysis.existing.has(dedupeHash),
      })),
    };
  }

  async commit(userId: string, file: UploadedImportFile | undefined): Promise<ImportBatchDto> {
    const analysis = await this.analyse(userId, file);
    const { summary } = analysis;

    if (summary.parsed === 0) {
      throw new BadRequestException('No expenses found in this file — nothing to import.');
    }
    if (summary.new === 0) {
      throw new ConflictException(
        `All ${summary.parsed} expenses in this file were already imported.`,
      );
    }

    return this.repository.saveBatch(
      userId,
      {
        fileName: analysis.fileName,
        fileSha256: analysis.fileSha256,
        parserId: analysis.parser.id,
        source: SOURCE_BY_PARSER[analysis.parser.id] ?? 'plain_text_import',
        summary,
        issues: analysis.result.issues,
      },
      analysis.expenses.filter((expense) => !analysis.existing.has(expense.dedupeHash)),
    );
  }

  list(userId: string): Promise<ImportBatchDto[]> {
    return this.repository.listBatches(userId);
  }

  async undo(userId: string, id: string): Promise<void> {
    const deleted = await this.repository.deleteBatch(userId, id);
    if (!deleted) throw new NotFoundException(`Import ${id} not found`);
  }

  private async analyse(userId: string, file: UploadedImportFile | undefined): Promise<Analysis> {
    if (!file) throw new BadRequestException('Attach a file in the "file" field.');

    const input = { fileName: file.originalname, content: decodeUtf8(file.buffer) };
    const parser = findParser(input);
    if (!parser) {
      const supported = expenseSourceParsers.map((p) => p.label).join(', ');
      throw new BadRequestException(`Unsupported file type. Supported: ${supported}.`);
    }

    const result = parser.parse(input);
    const expenses = fingerprintExpenses(result.expenses);
    const existing = await this.repository.findExistingHashes(
      userId,
      expenses.map((e) => e.dedupeHash),
    );

    return {
      fileName: file.originalname,
      fileSha256: createHash('sha256').update(file.buffer).digest('hex'),
      parser,
      result,
      expenses,
      existing,
      summary: summarize(expenses, existing, result.issues, result.skippedMessages),
    };
  }
}

/** Files saved on Windows often start with an invisible BOM character — drop it. */
function decodeUtf8(buffer: Buffer): string {
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function summarize(
  expenses: readonly FingerprintedExpense[],
  existing: Set<string>,
  issues: readonly ParseIssue[],
  skippedMessages: number,
): ImportSummaryDto {
  const fresh = expenses.filter((e) => !existing.has(e.dedupeHash));
  const dates = expenses.map((e) => e.date).sort();
  return {
    parsed: expenses.length,
    new: fresh.length,
    duplicates: expenses.length - fresh.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    skippedMessages,
    newAmount: fresh.reduce((sum, e) => sum + e.amount, 0),
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  };
}
