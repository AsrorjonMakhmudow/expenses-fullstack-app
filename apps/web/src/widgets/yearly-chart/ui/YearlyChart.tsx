import type { TimeseriesPointDto } from '@expenses/shared';
import { useMemo } from 'react';
import { chartThemes } from '@/shared/config';
import { useColorScheme } from '@/shared/lib';
import { Card } from '@/shared/ui';
import { barStyle, cartesianBase, EChart } from '@/shared/ui/chart';

/**
 * Total per year. Few bars → a bar chart compares them best.
 * The selected year is solid; the others are lighter. Click a bar to select its year.
 */
export function YearlyChart({
  points,
  selectedYear,
  onSelectYear,
}: {
  points: TimeseriesPointDto[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
}) {
  const theme = chartThemes[useColorScheme()];
  const option = useMemo(
    () => ({
      ...cartesianBase(
        theme,
        points.map((p) => p.period),
      ),
      series: [
        {
          type: 'bar',
          name: 'Total',
          ...barStyle,
          data: points.map((p) => ({
            value: p.total,
            itemStyle: {
              color: theme.series1,
              opacity: Number(p.period) === selectedYear ? 1 : 0.45,
              borderRadius: [4, 4, 0, 0],
            },
          })),
        },
      ],
    }),
    [points, selectedYear, theme],
  );

  return (
    <Card title="By year">
      <EChart
        option={option}
        height={240}
        ariaLabel={`Total spending per year: ${points.map((p) => `${p.period} ${p.total}`).join(', ')}`}
        onClick={({ name }) => onSelectYear(Number(name))}
      />
    </Card>
  );
}
