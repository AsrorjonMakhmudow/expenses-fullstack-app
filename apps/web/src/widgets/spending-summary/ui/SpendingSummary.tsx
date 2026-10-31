import { useQuery } from '@tanstack/react-query';
import { statsSummaryQuery, topExpensesQuery, yearRange } from '@/entities/spending';
import { formatDate, formatSom } from '@/shared/lib';
import { QueryState } from '@/shared/ui';

/** Headline numbers for one year. A single number reads faster than any chart. */
export function SpendingSummary({ year }: { year: number }) {
  const range = yearRange(year);
  const summary = useQuery(statsSummaryQuery(range));
  const biggest = useQuery(topExpensesQuery({ ...range, limit: 1 }));

  return (
    <QueryState query={summary}>
      {(data) => {
        const top = biggest.data?.[0];
        return (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={`Spent in ${year}`} value={formatSom(data.total)} />
            <Tile label="Per day (average)" value={formatSom(data.dailyAverage)} />
            <Tile label="Expenses" value={data.count.toLocaleString('ru-RU')} />
            <Tile
              label="Biggest expense"
              value={top ? formatSom(top.amount) : '—'}
              hint={top ? `${formatDate(top.date)} · ${top.description}` : undefined}
            />
          </div>
        );
      }}
    </QueryState>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && (
        <p className="mt-1 truncate text-xs text-ink-2" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
