import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { timeseriesQuery } from '@/entities/spending';
import { YearSelect } from '@/features/select-year';
import { QueryState } from '@/shared/ui';
import { DailyHeatmap } from '@/widgets/daily-heatmap';
import { MonthlyChart } from '@/widgets/monthly-chart';
import { SpendingSummary } from '@/widgets/spending-summary';
import { TopExpenses } from '@/widgets/top-expenses';
import { YearlyChart } from '@/widgets/yearly-chart';

/**
 * A page only COMPOSES widgets — no charts or API calls of its own beyond picking the year.
 * Adding a new dashboard block = one new widget + one line here.
 */
export function DashboardPage() {
  const years = useQuery(timeseriesQuery({ granularity: 'year' }));
  const [chosenYear, setChosenYear] = useState<number | null>(null);

  return (
    <QueryState
      query={years}
      isEmpty={(points) => points.length === 0}
      empty={
        <>
          No expenses yet.{' '}
          <Link to="/import" className="text-accent underline">
            Import your Telegram history
          </Link>{' '}
          or{' '}
          <Link to="/expenses" className="text-accent underline">
            add one by hand
          </Link>
          .
        </>
      }
    >
      {(points) => {
        const available = points.map((p) => Number(p.period));
        const year = chosenYear ?? available.at(-1) ?? new Date().getFullYear();
        return (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <YearSelect years={[...available].reverse()} value={year} onChange={setChosenYear} />
            </div>
            <SpendingSummary year={year} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <YearlyChart points={points} selectedYear={year} onSelectYear={setChosenYear} />
              <MonthlyChart year={year} />
            </div>
            <DailyHeatmap year={year} />
            <TopExpenses year={year} />
          </div>
        );
      }}
    </QueryState>
  );
}
