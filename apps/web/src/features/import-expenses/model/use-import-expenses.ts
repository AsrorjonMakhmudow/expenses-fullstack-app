import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseKeys } from '@/entities/expense';
import { importBatchApi, importBatchKeys } from '@/entities/import-batch';
import { statsKeys } from '@/entities/spending';

/** Step 1: ask the server what WOULD be imported. Saves nothing, so nothing to refresh. */
export function usePreviewImport() {
  return useMutation({ mutationFn: (file: File) => importBatchApi.preview(file) });
}

/** Step 2: import for real, then refresh everything that shows expenses. */
export function useCommitImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importBatchApi.commit(file),
    onSuccess: () =>
      Promise.all(
        [expenseKeys.all, statsKeys.all, importBatchKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
