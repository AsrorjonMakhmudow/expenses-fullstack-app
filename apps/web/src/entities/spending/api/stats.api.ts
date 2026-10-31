import type {
  StatsRange,
  StatsSummaryDto,
  TimeseriesPointDto,
  TimeseriesQuery,
  TopExpenseDto,
  TopExpensesQuery,
} from '@expenses/shared';
import { queryOptions } from '@tanstack/react-query';
import { http, toQueryString } from '@/shared/api';

export const statsApi = {
  summary: (range: StatsRange) => http<StatsSummaryDto>(`/stats/summary${toQueryString(range)}`),
  timeseries: (query: TimeseriesQuery) =>
    http<TimeseriesPointDto[]>(`/stats/timeseries${toQueryString(query)}`),
  top: (query: Partial<TopExpensesQuery>) =>
    http<TopExpenseDto[]>(`/stats/top${toQueryString(query)}`),
};

export const statsKeys = {
  all: ['stats'] as const,
  summary: (range: StatsRange) => [...statsKeys.all, 'summary', range] as const,
  timeseries: (query: TimeseriesQuery) => [...statsKeys.all, 'timeseries', query] as const,
  top: (query: Partial<TopExpensesQuery>) => [...statsKeys.all, 'top', query] as const,
};

export const statsSummaryQuery = (range: StatsRange) =>
  queryOptions({ queryKey: statsKeys.summary(range), queryFn: () => statsApi.summary(range) });

export const timeseriesQuery = (query: TimeseriesQuery) =>
  queryOptions({
    queryKey: statsKeys.timeseries(query),
    queryFn: () => statsApi.timeseries(query),
  });

export const topExpensesQuery = (query: Partial<TopExpensesQuery>) =>
  queryOptions({ queryKey: statsKeys.top(query), queryFn: () => statsApi.top(query) });
