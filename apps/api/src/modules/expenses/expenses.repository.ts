import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseSource,
  ListExpensesQuery,
  Paginated,
  UpdateExpenseInput,
} from '@expenses/shared';

/**
 * WHAT we need from storage — not HOW it is stored (Dependency Inversion Principle).
 *
 * The service depends on this abstract class, not on Drizzle or PostgreSQL. So:
 *  - unit tests use a fast in-memory version (no database needed),
 *  - we could change the ORM/database by writing one new class.
 *
 * Why an abstract class and not an interface? TypeScript interfaces disappear after
 * compilation, but Nest's dependency injection needs a real runtime value as the key.
 *
 * Every method takes userId: data is ALWAYS scoped to its owner. A repository that
 * could load "any expense by id" would be an IDOR security bug waiting to happen.
 */
export abstract class ExpensesRepository {
  abstract list(userId: string, query: ListExpensesQuery): Promise<Paginated<ExpenseDto>>;
  abstract findById(userId: string, id: string): Promise<ExpenseDto | null>;
  abstract create(
    userId: string,
    input: CreateExpenseInput,
    source?: ExpenseSource,
  ): Promise<ExpenseDto>;
  abstract update(
    userId: string,
    id: string,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDto | null>;
  /** Returns false if nothing was deleted (not found / not yours). */
  abstract delete(userId: string, id: string): Promise<boolean>;
}
