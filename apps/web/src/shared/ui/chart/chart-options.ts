import type { ChartTheme } from '@/shared/config';
import { formatSom, formatSomShort } from '@/shared/lib';

/**
 * Common pieces of every bar/line chart, written once (DRY):
 * recessive grid and axes, short money labels on the y-axis, a full amount in the tooltip.
 */
export function cartesianBase(theme: ChartTheme, categories: string[]) {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: theme.text, fontFamily: 'inherit' },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      valueFormatter: (value: unknown) => formatSom(Number(value)),
    },
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLine: { lineStyle: { color: theme.axis } },
      axisTick: { show: false },
      axisLabel: { color: theme.textMuted },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.textMuted, formatter: (v: number) => formatSomShort(v) },
    },
  };
}

/** Thin bars with rounded tops, anchored to the baseline. */
export const barStyle = { barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } };
