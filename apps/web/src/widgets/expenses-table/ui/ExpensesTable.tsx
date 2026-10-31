import type { IsoDate } from '@expenses/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { expenseListQuery } from '@/entities/expense';
import { DeleteExpenseButton } from '@/features/delete-expense';
import { formatDate, formatSom, useDebouncedValue } from '@/shared/lib';
import { Button, Card, QueryState } from '@/shared/ui';

const PAGE_SIZE = 50;
const inputClass = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink';

const SOURCE_LABEL: Record<string, string> = {
  manual: 'manual',
  telegram_import: 'Telegram',
  plain_text_import: 'text file',
  bot: 'bot',
};

/** All expenses: filter by dates, search the description, page through results. */
export function ExpensesTable() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Don't send a request on every keystroke — wait until typing pauses for 300 ms.
  const q = useDebouncedValue(search.trim());

  const query = useQuery({
    ...expenseListQuery({
      from: (from || undefined) as IsoDate | undefined,
      to: (to || undefined) as IsoDate | undefined,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData, // keep showing the old page while the next loads
  });

  const resetPage = () => setPage(1);

  return (
    <Card title="All expenses">
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="date"
          aria-label="From"
          className={inputClass}
          value={from}
          onChange={(e) => (setFrom(e.target.value), resetPage())}
        />
        <input
          type="date"
          aria-label="To"
          className={inputClass}
          value={to}
          onChange={(e) => (setTo(e.target.value), resetPage())}
        />
        <input
          type="search"
          placeholder="Search description…"
          className={`${inputClass} min-w-48 flex-1`}
          value={search}
          onChange={(e) => (setSearch(e.target.value), resetPage())}
        />
      </div>

      <QueryState
        query={query}
        isEmpty={(data) => data.total === 0}
        empty="No expenses found. Add one above or import your Telegram history."
      >
        {(data) => {
          const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
          const pageTotal = data.items.reduce((sum, e) => sum + e.amount, 0);
          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-3">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 text-right font-medium">Amount</th>
                      <th className="py-2 pr-3 font-medium">Description</th>
                      <th className="py-2 pr-3 font-medium">Source</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((expense) => (
                      <tr key={expense.id}>
                        <td className="whitespace-nowrap py-2 pr-3 text-ink-2">
                          {formatDate(expense.date)}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right font-medium">
                          {formatSom(expense.amount)}
                        </td>
                        <td className="py-2 pr-3">{expense.description}</td>
                        <td className="py-2 pr-3 text-ink-3">
                          {SOURCE_LABEL[expense.source] ?? expense.source}
                        </td>
                        <td className="py-2 text-right">
                          <DeleteExpenseButton id={expense.id} label={expense.description} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
                <span>
                  {data.total} expenses · this page: {formatSom(pageTotal)}
                </span>
                <span className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    ← Prev
                  </Button>
                  {page} / {pages}
                  <Button
                    variant="secondary"
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next →
                  </Button>
                </span>
              </footer>
            </>
          );
        }}
      </QueryState>
    </Card>
  );
}
