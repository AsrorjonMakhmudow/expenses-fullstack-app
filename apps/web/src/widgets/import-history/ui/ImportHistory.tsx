import { useQuery } from '@tanstack/react-query';
import { importBatchListQuery } from '@/entities/import-batch';
import { UndoImportButton } from '@/features/import-expenses';
import { formatSom } from '@/shared/lib';
import { Card, QueryState } from '@/shared/ui';

/** Every past import, newest first, each with an Undo button. */
export function ImportHistory() {
  const query = useQuery(importBatchListQuery());

  return (
    <Card title="Import history">
      <QueryState query={query} isEmpty={(rows) => rows.length === 0} empty="No imports yet.">
        {(rows) => (
          <ul className="divide-y divide-line text-sm">
            {rows.map((batch) => (
              <li key={batch.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="text-ink-2">
                  {new Date(batch.createdAt).toLocaleString('ru-RU')}
                </span>
                <span className="flex-1 truncate font-medium">{batch.fileName}</span>
                <span>
                  {batch.summary.new} expenses · {formatSom(batch.summary.newAmount)}
                </span>
                <UndoImportButton
                  id={batch.id}
                  fileName={batch.fileName}
                  count={batch.summary.new}
                />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Card>
  );
}
