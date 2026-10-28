import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseSource,
  IsoDate,
  ListExpensesQuery,
  Paginated,
  UpdateExpenseInput,
} from '@expenses/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DB } from '../../infra/database/database.module.js';
import type { Database } from '../../infra/database/database.module.js';
import { expenses } from '../../infra/database/schema.js';
import { ExpensesRepository } from './expenses.repository.js';

type ExpenseRow = typeof expenses.$inferSelect;

/** Database row → API shape. The only place that knows both. */
function toDto(row: ExpenseRow): ExpenseDto {
  return {
    id: row.id,
    date: row.spentOn as IsoDate,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** In LIKE patterns, % and _ are wildcards. Escape them so "50%" searches for "50%". */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class DrizzleExpensesRepository extends ExpensesRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super();
  }

  async list(userId: string, query: ListExpensesQuery): Promise<Paginated<ExpenseDto>> {
    const { from, to, q, page, pageSize } = query;

    // Values are sent to PostgreSQL as parameters ($1, $2…), never glued into the SQL text,
    // so user input can't change the query (no SQL injection).
    const conditions: SQL[] = [eq(expenses.userId, userId)];
    if (from) conditions.push(gte(expenses.spentOn, from));
    if (to) conditions.push(lte(expenses.spentOn, to));
    if (q) conditions.push(ilike(expenses.description, `%${escapeLike(q)}%`));
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(expenses)
        .where(where)
        .orderBy(desc(expenses.spentOn), desc(expenses.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(expenses).where(where),
    ]);

    return { items: rows.map(toDto), page, pageSize, total: totals[0]?.total ?? 0 };
  }

  async findById(userId: string, id: string): Promise<ExpenseDto | null> {
    const [row] = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)));
    return row ? toDto(row) : null;
  }

  async create(
    userId: string,
    input: CreateExpenseInput,
    source: ExpenseSource = 'manual',
  ): Promise<ExpenseDto> {
    const [row] = await this.db
      .insert(expenses)
      .values({
        userId,
        spentOn: input.date,
        amount: input.amount,
        description: input.description,
        source,
      })
      .returning();
    if (!row) throw new Error('Insert returned no row');
    return toDto(row);
  }

  async update(userId: string, id: string, input: UpdateExpenseInput): Promise<ExpenseDto | null> {
    const [row] = await this.db
      .update(expenses)
      .set({
        ...(input.date !== undefined && { spentOn: input.date }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.description !== undefined && { description: input.description }),
      })
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)))
      .returning();
    return row ? toDto(row) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.id, id)))
      .returning({ id: expenses.id });
    return deleted.length > 0;
  }
}
