import { StatsRangeSchema, TimeseriesQuerySchema, TopExpensesQuerySchema } from '@expenses/shared';
import type { StatsRange, TimeseriesQuery, TopExpensesQuery } from '@expenses/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { StatsService } from './stats.service.js';

/**
 *   GET /api/v1/stats/summary?from=2026-01-01&to=2026-12-31
 *   GET /api/v1/stats/timeseries?granularity=month&from=2026-01-01&to=2026-12-31
 *   GET /api/v1/stats/top?limit=10
 */
@Controller({ path: 'stats', version: '1' })
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('summary')
  summary(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(StatsRangeSchema)) range: StatsRange,
  ) {
    return this.stats.summary(userId, range);
  }

  @Get('timeseries')
  timeseries(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(TimeseriesQuerySchema)) query: TimeseriesQuery,
  ) {
    return this.stats.timeseries(userId, query);
  }

  @Get('top')
  top(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(TopExpensesQuerySchema)) query: TopExpensesQuery,
  ) {
    return this.stats.top(userId, query);
  }
}
