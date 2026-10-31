/**
 * Chart colors in ONE place. Charts reference roles ("series1", "grid"), never raw hex,
 * so changing the brand later means editing only this file.
 *
 * Values come from a validated data-viz palette: series1/series2 are distinguishable for
 * color-blind readers, and the heatmap is ONE hue light → dark (more spending = darker).
 */
export interface ChartTheme {
  surface: string;
  text: string;
  textMuted: string;
  grid: string;
  axis: string;
  series1: string;
  series2: string;
  /** Sequential ramp for the calendar heatmap, low → high. */
  heat: string[];
  heatEmpty: string;
}

export const chartThemes: Record<'light' | 'dark', ChartTheme> = {
  light: {
    surface: '#fcfcfb',
    text: '#0b0b0b',
    textMuted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    series1: '#2a78d6',
    series2: '#eb6834',
    heat: ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'],
    heatEmpty: '#f0efec',
  },
  dark: {
    surface: '#1a1a19',
    text: '#f0efec',
    textMuted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
    series1: '#3987e5',
    series2: '#d95926',
    heat: ['#104281', '#1c5cab', '#2a78d6', '#5598e7', '#9ec5f4'],
    heatEmpty: '#262624',
  },
};
