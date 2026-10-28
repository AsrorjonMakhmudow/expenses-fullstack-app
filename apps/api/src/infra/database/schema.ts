import { EXPENSE_SOURCES } from '@expenses/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { ImportSummaryDto, ParseIssue } from '@expenses/shared';

/*
 * Database schema — the single source of truth for tables.
 * After changing it: `pnpm --filter @expenses/api db:generate` creates a new SQL migration
 * in apps/api/drizzle/. Review the SQL, commit it, then `db:migrate` applies it.
 * Never edit a migration that was already applied — add a new one.
 */

const createdAt = () =>
  timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  /** Filled in Phase 6 (auth). Nullable until then. */
  passwordHash: text('password_hash'),
  createdAt: createdAt(),
});

/**
 * One uploaded file = one import batch. Lets us show import history and UNDO an import
 * (delete the batch → its expenses go with it).
 */
export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    /** SHA-256 of the file: lets us tell "you already uploaded exactly this file". */
    fileSha256: char('file_sha256', { length: 64 }).notNull(),
    parserId: text('parser_id').notNull(),
    parsedCount: integer('parsed_count').notNull(),
    importedCount: integer('imported_count').notNull(),
    duplicateCount: integer('duplicate_count').notNull(),
    /** Summary + every problem line, as JSON — read-only history, never queried by field. */
    summary: jsonb('summary').$type<ImportSummaryDto>().notNull(),
    issues: jsonb('issues').$type<ParseIssue[]>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('import_batches_user_id_created_at_idx').on(table.userId, table.createdAt)],
);

// Values come from the shared contract, so DB, API and UI always agree (DRY).
export const expenseSource = pgEnum('expense_source', EXPENSE_SOURCES);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The day the money was spent. DATE, not timestamp: no time-zone surprises. */
    spentOn: date('spent_on', { mode: 'string' }).notNull(),
    /** Whole so'm. BIGINT because a big purchase can exceed INT's 2.1 billion limit. */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('UZS'),
    description: text('description').notNull(),
    source: expenseSource('source').notNull().default('manual'),
    /** Original line from an import, for audit. Null for manual expenses. */
    rawLine: text('raw_line'),
    /** Fingerprint to skip duplicates on re-import. Null for manual expenses. */
    dedupeHash: text('dedupe_hash'),
    /** Which import created this row. Deleting the batch deletes its expenses (undo). */
    importBatchId: uuid('import_batch_id').references(() => importBatches.id, {
      onDelete: 'cascade',
    }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Almost every query is "this user's expenses between two dates".
    index('expenses_user_id_spent_on_idx').on(table.userId, table.spentOn),
    uniqueIndex('expenses_user_id_dedupe_hash_key').on(table.userId, table.dedupeHash),
    // Makes "undo import" (cascade delete by batch) fast.
    index('expenses_import_batch_id_idx').on(table.importBatchId),
    // The database protects itself too — not only the API validation.
    check('expenses_amount_positive', sql`${table.amount} > 0`),
  ],
);

export const schema = { users, importBatches, expenses, expenseSource };
export type Schema = typeof schema;
