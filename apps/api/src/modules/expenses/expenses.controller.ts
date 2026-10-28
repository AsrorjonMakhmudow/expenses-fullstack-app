import {
  CreateExpenseSchema,
  ExpenseIdSchema,
  ListExpensesQuerySchema,
  UpdateExpenseSchema,
} from '@expenses/shared';
import type { CreateExpenseInput, ListExpensesQuery, UpdateExpenseInput } from '@expenses/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ExpensesService } from './expenses.service.js';

/**
 * HTTP layer only: read the request, validate it, call the service, return the result.
 * No business logic and no SQL here.
 *
 *   GET    /api/v1/expenses?from=2026-10-01&to=2026-10-31&q=нон&page=1&pageSize=50
 *   GET    /api/v1/expenses/:id
 *   POST   /api/v1/expenses        { "date": "2026-10-04", "amount": 65000, "description": "..." }
 *   PATCH  /api/v1/expenses/:id    { "amount": 70000 }
 *   DELETE /api/v1/expenses/:id
 */
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(ListExpensesQuerySchema)) query: ListExpensesQuery,
  ) {
    return this.expenses.list(userId, query);
  }

  @Get(':id')
  get(
    @CurrentUserId() userId: string,
    @Param('id', new ZodValidationPipe(ExpenseIdSchema)) id: string,
  ) {
    return this.expenses.get(userId, id);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateExpenseSchema)) body: CreateExpenseInput,
  ) {
    return this.expenses.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', new ZodValidationPipe(ExpenseIdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateExpenseSchema)) body: UpdateExpenseInput,
  ) {
    return this.expenses.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUserId() userId: string,
    @Param('id', new ZodValidationPipe(ExpenseIdSchema)) id: string,
  ): Promise<void> {
    await this.expenses.delete(userId, id);
  }
}
