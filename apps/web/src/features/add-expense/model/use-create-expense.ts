import type { CreateExpenseInput } from '@expenses/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi, expenseKeys } from '@/entities/expense';
import { statsKeys } from '@/entities/spending';

/** Save a new expense, then refresh every list and chart that could include it. */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expenseApi.create(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
        queryClient.invalidateQueries({ queryKey: statsKeys.all }),
      ]),
  });
}
