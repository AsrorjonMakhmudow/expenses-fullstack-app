import { Module } from '@nestjs/common';
import { DrizzleImportsRepository } from './drizzle-imports.repository.js';
import { ImportsController } from './imports.controller.js';
import { ImportsRepository } from './imports.repository.js';
import { ImportsService } from './imports.service.js';

/** Import expense history from files. Remove = delete this folder + one line in app.module.ts. */
@Module({
  controllers: [ImportsController],
  providers: [ImportsService, { provide: ImportsRepository, useClass: DrizzleImportsRepository }],
})
export class ImportsModule {}
