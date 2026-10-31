import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { timeseriesQuery, yearRange } from '@/entities/spending';
import { chartThemes } from '@/shared/config';
import { monthLabel, useColorScheme } from '@/shared/lib';
import { Card, QueryState } from '@/shared/ui';
import { barStyle, cartesianBase, EChart } from '@/shared/ui/chart';

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

/**
 * 12 months of the selected year next to the same months last year.
 * Side-by-side bars answer "am I spending more than last year?" at a glance.
 */
export function MonthlyChart({ year }: { year: number }) {
  const theme = chartThemes[useColorScheme()];
  const current = useQuery(timeseriesQuery({ granularity: 'month', ...yearRange(year) }));
  const previous = useQuery(timeseriesQuery({ granularity: 'month', ...yearRange(year - 1) }));

  const option = useMemo(() => {
    const totals = (points: { period: string; total: number }[] | undefined, y: number) => {
      const byPeriod = new Map(points?.map((p) => [p.period, p.total]));
      return MONTHS.map((m) => byPeriod.get(`${y}-${m}`) ?? 0);
    };
    return {
      ...cartesianBase(
        theme,
        MONTHS.map((m) => monthLabel(`${year}-${m}`)),
      ),
      color: [theme.series2, theme.series1],
      legend: { top: 0, right: 0, textStyle: { color: theme.textMuted } },
      series: [
        { type: 'bar', name: String(year - 1), ...barStyle, data: totals(previous.data, year - 1) },
        { type: 'bar', name: String(year), ...barStyle, data: totals(current.data, year) },
      ],
    };
  }, [current.data, previous.data, theme, year]);

  return (
    <Card title={`By month — ${year} vs ${year - 1}`}>
      <QueryState query={current}>
        {() => (
          <EChart
            option={option}
            ariaLabel={`Monthly spending in ${year} compared with ${year - 1}`}
          />
        )}
      </QueryState>
    </Card>
  );
}
