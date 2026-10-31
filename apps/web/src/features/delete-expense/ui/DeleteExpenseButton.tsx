import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi, expenseKeys } from '@/entities/expense';
import { statsKeys } from '@/entities/spending';
import { Button } from '@/shared/ui';

/** Delete one expense (asks first — deleting money history by accident is painful). */
export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => expenseApi.remove(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
        queryClient.invalidateQueries({ queryKey: statsKeys.all }),
      ]),
  });

  return (
    <Button
      variant="danger"
      aria-label={`Delete ${label}`}
      disabled={remove.isPending}
      onClick={() => {
        if (window.confirm(`Delete "${label}"?`)) remove.mutate();
      }}
    >
      {remove.isPending ? '…' : 'Delete'}
    </Button>
  );
}
