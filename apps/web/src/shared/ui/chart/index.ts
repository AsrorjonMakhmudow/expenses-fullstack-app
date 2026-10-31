// Separate entry point on purpose: the chart library is big (~600 kB), so only pages that
// really draw charts import "@/shared/ui/chart" — the others stay light.
export { barStyle, cartesianBase } from './chart-options';
export { EChart } from './EChart';
export type { EChartClickEvent } from './EChart';
