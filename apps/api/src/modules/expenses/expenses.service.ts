import type {
  CreateExpenseInput,
  ExpenseDto,
  ListExpensesQuery,
  Paginated,
  UpdateExpenseInput,
} from '@expenses/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpensesRepository } from './expenses.repository.js';

/**
 * Business rules for expenses. Knows nothing about HTTP (that's the controller)
 * and nothing about SQL (that's the repository) — Single Responsibility.
 *
 * Today it's thin. This is where future rules go: e.g. "emit expense.created so the
 * budgets feature can react" — without touching the controller or the repository.
 */
@Injectable()
export class ExpensesService {
  constructor(private readonly repository: ExpensesRepository) {}

  list(userId: string, query: ListExpensesQuery): Promise<Paginated<ExpenseDto>> {
    return this.repository.list(userId, query);
  }

  async get(userId: string, id: string): Promise<ExpenseDto> {
    return this.orNotFound(await this.repository.findById(userId, id), id);
  }

  create(userId: string, input: CreateExpenseInput): Promise<ExpenseDto> {
    return this.repository.create(userId, input);
  }

  async update(userId: string, id: string, input: UpdateExpenseInput): Promise<ExpenseDto> {
    return this.orNotFound(await this.repository.update(userId, id, input), id);
  }

  async delete(userId: string, id: string): Promise<void> {
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) throw this.notFound(id);
  }

  // "Not yours" and "doesn't exist" give the SAME 404, so nobody can probe other users' ids.
  private orNotFound(expense: ExpenseDto | null, id: string): ExpenseDto {
    if (!expense) throw this.notFound(id);
    return expense;
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Expense ${id} not found`);
  }
}
