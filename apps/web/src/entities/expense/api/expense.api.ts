import type {
  CreateExpenseInput,
  ExpenseDto,
  ListExpensesQuery,
  Paginated,
  UpdateExpenseInput,
} from '@expenses/shared';
import { queryOptions } from '@tanstack/react-query';
import { http, json, toQueryString } from '@/shared/api';

/** Raw API calls for expenses. Types come from the shared contract — the same as the server. */
export const expenseApi = {
  list: (query: Partial<ListExpensesQuery>) =>
    http<Paginated<ExpenseDto>>(`/expenses${toQueryString(query)}`),
  create: (input: CreateExpenseInput) =>
    http<ExpenseDto>('/expenses', { method: 'POST', body: json(input) }),
  update: (id: string, input: UpdateExpenseInput) =>
    http<ExpenseDto>(`/expenses/${id}`, { method: 'PATCH', body: json(input) }),
  remove: (id: string) => http<void>(`/expenses/${id}`, { method: 'DELETE' }),
};

/**
 * Query keys = names of cached data. Mutations invalidate by key, e.g.
 * after adding an expense: invalidate expenseKeys.all → every expense list refetches.
 */
export const expenseKeys = {
  all: ['expenses'] as const,
  list: (query: Partial<ListExpensesQuery>) => [...expenseKeys.all, 'list', query] as const,
};

export const expenseListQuery = (query: Partial<ListExpensesQuery>) =>
  queryOptions({
    queryKey: expenseKeys.list(query),
    queryFn: () => expenseApi.list(query),
  });
