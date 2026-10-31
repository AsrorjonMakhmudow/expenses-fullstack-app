import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseKeys } from '@/entities/expense';
import { importBatchApi, importBatchKeys } from '@/entities/import-batch';
import { statsKeys } from '@/entities/spending';
import { Button } from '@/shared/ui';

/** Undo an import: deletes exactly the expenses that this upload added. */
export function UndoImportButton({
  id,
  fileName,
  count,
}: {
  id: string;
  fileName: string;
  count: number;
}) {
  const queryClient = useQueryClient();
  const undo = useMutation({
    mutationFn: () => importBatchApi.undo(id),
    onSuccess: () =>
      Promise.all(
        [expenseKeys.all, statsKeys.all, importBatchKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });

  return (
    <Button
      variant="danger"
      disabled={undo.isPending}
      onClick={() => {
        if (window.confirm(`Undo "${fileName}"? This deletes the ${count} expenses it imported.`)) {
          undo.mutate();
        }
      }}
    >
      {undo.isPending ? 'Undoing…' : 'Undo'}
    </Button>
  );
}
