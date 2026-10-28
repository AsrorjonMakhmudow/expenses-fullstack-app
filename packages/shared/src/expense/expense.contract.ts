import { z } from 'zod';
import { parseIsoDatePrefix } from '../lib/date.js';
import type { IsoDate } from '../lib/date.js';

/*
 * The API CONTRACT for expenses: the exact shapes the backend accepts and returns.
 * Written once here and used by:
 *   - apps/api  → validates incoming requests (never trust the client)
 *   - apps/web  → validates forms and types API responses (later)
 *   - apps/mobile (later)
 * One source of truth = front and back can never silently disagree (DRY).
 */

/** "2026-10-04" — must be a real calendar day. */
export const IsoDateSchema = z
  .string()
  .refine((value) => parseIsoDatePrefix(value) === value, {
    message: 'Expected a real date in YYYY-MM-DD format',
  })
  .transform((value) => value as IsoDate);

/** Whole so'm, positive, and small enough to be exact in JavaScript. */
export const AmountSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const DescriptionSchema = z.string().trim().min(1).max(500);

export const EXPENSE_SOURCES = ['manual', 'telegram_import', 'plain_text_import', 'bot'] as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

/** What the API returns for one expense. */
export interface ExpenseDto {
  id: string;
  date: IsoDate;
  amount: number;
  currency: string;
  description: string;
  source: ExpenseSource;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/v1/expenses */
export const CreateExpenseSchema = z.object({
  date: IsoDateSchema,
  amount: AmountSchema,
  description: DescriptionSchema,
});
export type CreateExpenseInput = z.output<typeof CreateExpenseSchema>;

/** PATCH /api/v1/expenses/:id — any subset of fields, but at least one. */
export const UpdateExpenseSchema = CreateExpenseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update' },
);
export type UpdateExpenseInput = z.output<typeof UpdateExpenseSchema>;

/** GET /api/v1/expenses?from=&to=&q=&page=&pageSize= (query values arrive as strings). */
export const ListExpensesQuerySchema = z
  .object({
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: '"from" must be before or equal to "to"',
    path: ['from'],
  });
export type ListExpensesQuery = z.output<typeof ListExpensesQuerySchema>;

export const ExpenseIdSchema = z.uuid();

/** Standard shape for any paginated list. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
