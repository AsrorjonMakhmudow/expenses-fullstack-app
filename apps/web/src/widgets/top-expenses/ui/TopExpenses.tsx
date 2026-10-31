import { useQuery } from '@tanstack/react-query';
import { topExpensesQuery, yearRange } from '@/entities/spending';
import { formatDate, formatSom } from '@/shared/lib';
import { Card, QueryState } from '@/shared/ui';

/** The 10 biggest expenses of the year — where most of the money actually went. */
export function TopExpenses({ year }: { year: number }) {
  const query = useQuery(topExpensesQuery({ ...yearRange(year), limit: 10 }));

  return (
    <Card title={`Top 10 expenses of ${year}`}>
      <QueryState
        query={query}
        isEmpty={(rows) => rows.length === 0}
        empty="No expenses this year."
      >
        {(rows) => (
          <ol className="divide-y divide-line text-sm">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-3 py-2">
                <span className="w-5 text-right text-ink-3">{index + 1}</span>
                <span className="w-24 text-ink-2">{formatDate(row.date)}</span>
                <span className="flex-1 truncate" title={row.description}>
                  {row.description}
                </span>
                <span className="font-semibold">{formatSom(row.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </QueryState>
    </Card>
  );
}
