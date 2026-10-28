import { Module } from '@nestjs/common';
import { DrizzleExpensesRepository } from './drizzle-expenses.repository.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesRepository } from './expenses.repository.js';
import { ExpensesService } from './expenses.service.js';

/**
 * The "expenses" feature as one plug-in unit.
 * Remove the feature = delete this folder + one line in app.module.ts.
 */
@Module({
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    // "Whoever asks for ExpensesRepository gets the Drizzle implementation."
    { provide: ExpensesRepository, useClass: DrizzleExpensesRepository },
  ],
  // Exported so the imports feature (Phase 4) can reuse it — through the module's front door.
  exports: [ExpensesService],
})
export class ExpensesModule {}
