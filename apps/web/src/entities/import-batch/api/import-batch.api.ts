import type { ImportBatchDto, ImportPreviewDto } from '@expenses/shared';
import { queryOptions } from '@tanstack/react-query';
import { http } from '@/shared/api';

const withFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

export const importBatchApi = {
  preview: (file: File) =>
    http<ImportPreviewDto>('/imports/preview', { method: 'POST', body: withFile(file) }),
  commit: (file: File) =>
    http<ImportBatchDto>('/imports', { method: 'POST', body: withFile(file) }),
  list: () => http<ImportBatchDto[]>('/imports'),
  undo: (id: string) => http<void>(`/imports/${id}`, { method: 'DELETE' }),
};

export const importBatchKeys = {
  all: ['import-batches'] as const,
};

export const importBatchListQuery = () =>
  queryOptions({ queryKey: importBatchKeys.all, queryFn: importBatchApi.list });
