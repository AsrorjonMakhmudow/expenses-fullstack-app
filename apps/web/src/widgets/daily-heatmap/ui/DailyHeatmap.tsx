import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { timeseriesQuery, yearRange } from '@/entities/spending';
import { chartThemes } from '@/shared/config';
import { formatDate, formatSom, useColorScheme } from '@/shared/lib';
import { Card, QueryState } from '@/shared/ui';
import { EChart } from '@/shared/ui/chart';

/** The 95th percentile, so one huge day (rent, a phone) doesn't make every other day look pale. */
function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted.at(-1) ?? 0;
}

/**
 * Every day of the year as a square, darker = more spent (like GitHub contributions).
 * Shows weekly rhythms, expensive days and quiet periods that bars would hide.
 */
export function DailyHeatmap({ year }: { year: number }) {
  const theme = chartThemes[useColorScheme()];
  const query = useQuery(timeseriesQuery({ granularity: 'day', ...yearRange(year) }));

  const option = useMemo(() => {
    const days = (query.data ?? []).filter((p) => p.total > 0);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params: { value: [string, number] }) =>
          `${formatDate(params.value[0])}<br/><b>${formatSom(params.value[1])}</b>`,
      },
      visualMap: {
        min: 0,
        max: Math.max(percentile95(days.map((d) => d.total)), 1),
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 160,
        text: ['More', 'Less'],
        inRange: { color: theme.heat },
        textStyle: { color: theme.textMuted },
      },
      calendar: {
        range: String(year),
        top: 28,
        left: 40,
        right: 8,
        cellSize: ['auto', 14],
        splitLine: { show: false },
        itemStyle: { color: theme.heatEmpty, borderColor: theme.surface, borderWidth: 2 },
        yearLabel: { show: false },
        dayLabel: { color: theme.textMuted, firstDay: 1, nameMap: 'en' },
        monthLabel: { color: theme.textMuted, nameMap: 'en' },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: days.map((d) => [d.period, d.total]),
          itemStyle: { borderColor: theme.surface, borderWidth: 2 },
        },
      ],
    };
  }, [query.data, theme, year]);

  return (
    <Card title={`Every day of ${year}`}>
      <QueryState query={query}>
        {() => (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <EChart
                option={option}
                height={200}
                ariaLabel={`Daily spending calendar for ${year}`}
              />
            </div>
          </div>
        )}
      </QueryState>
    </Card>
  );
}
