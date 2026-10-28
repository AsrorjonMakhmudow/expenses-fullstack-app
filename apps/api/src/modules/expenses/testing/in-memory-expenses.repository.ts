import { randomUUID } from 'node:crypto';
import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseSource,
  ListExpensesQuery,
  Paginated,
  UpdateExpenseInput,
} from '@expenses/shared';
import { ExpensesRepository } from '../expenses.repository.js';

/** Fake repository for fast unit tests. Same contract as the real one, data in an array. */
export class InMemoryExpensesRepository extends ExpensesRepository {
  private readonly rows: (ExpenseDto & { userId: string })[] = [];

  async list(userId: string, query: ListExpensesQuery): Promise<Paginated<ExpenseDto>> {
    const { from, to, q, page, pageSize } = query;
    const matching = this.rows
      .filter((row) => row.userId === userId)
      .filter((row) => (!from || row.date >= from) && (!to || row.date <= to))
      .filter((row) => !q || row.description.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
    const items = matching
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ userId: _userId, ...dto }) => dto);
    return { items, page, pageSize, total: matching.length };
  }

  async findById(userId: string, id: string): Promise<ExpenseDto | null> {
    const row = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!row) return null;
    const { userId: _userId, ...dto } = row;
    return dto;
  }

  async create(
    userId: string,
    input: CreateExpenseInput,
    source: ExpenseSource = 'manual',
  ): Promise<ExpenseDto> {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      userId,
      currency: 'UZS',
      source,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.rows.push(row);
    const { userId: _userId, ...dto } = row;
    return dto;
  }

  async update(userId: string, id: string, input: UpdateExpenseInput): Promise<ExpenseDto | null> {
    const row = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!row) return null;
    Object.assign(row, input, { updatedAt: new Date().toISOString() });
    const { userId: _userId, ...dto } = row;
    return dto;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const index = this.rows.findIndex((r) => r.userId === userId && r.id === id);
    if (index === -1) return false;
    this.rows.splice(index, 1);
    return true;
  }
}
