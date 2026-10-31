import { Module } from '@nestjs/common';
import { DrizzleStatsRepository } from './drizzle-stats.repository.js';
import { StatsController } from './stats.controller.js';
import { StatsRepository } from './stats.repository.js';
import { localToday, StatsService, TODAY } from './stats.service.js';

/** Read-only statistics for the dashboard. Remove = delete folder + one line in app.module.ts. */
@Module({
  controllers: [StatsController],
  providers: [
    StatsService,
    { provide: StatsRepository, useClass: DrizzleStatsRepository },
    { provide: TODAY, useValue: localToday },
  ],
})
export class StatsModule {}
