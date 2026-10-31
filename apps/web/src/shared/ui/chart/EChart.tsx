import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import {
  CalendarComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

// Register only what we use → much smaller bundle than importing all of ECharts.
echarts.use([
  BarChart,
  LineChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CalendarComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export interface EChartClickEvent {
  name: string;
  value: unknown;
}

interface EChartProps {
  option: EChartsCoreOption;
  height?: number;
  /** Describes the chart for screen readers (the canvas itself is invisible to them). */
  ariaLabel: string;
  onClick?: (event: EChartClickEvent) => void;
}

/**
 * A thin React wrapper around ECharts (no extra library needed):
 * create once → update when `option` changes → resize with the container → clean up.
 */
export function EChart({ option, height = 280, ariaLabel, onClick }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  // Keep the latest handler in a ref, so we subscribe once and never call a stale one.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container);
    chartRef.current = chart;
    chart.on('click', (params) => {
      onClickRef.current?.({ name: String(params.name), value: params.value });
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} role="img" aria-label={ariaLabel} style={{ height }} />;
}
