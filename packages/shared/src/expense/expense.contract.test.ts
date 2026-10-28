import { describe, expect, it } from 'vitest';
import {
  CreateExpenseSchema,
  ListExpensesQuerySchema,
  UpdateExpenseSchema,
} from './expense.contract.js';

describe('CreateExpenseSchema', () => {
  it('accepts a valid expense and trims the description', () => {
    const result = CreateExpenseSchema.parse({
      date: '2026-10-04',
      amount: 65_000,
      description: '  билайн  ',
    });
    expect(result).toEqual({ date: '2026-10-04', amount: 65_000, description: 'билайн' });
  });

  it.each([
    ['impossible date', { date: '2026-02-31', amount: 1, description: 'x' }],
    ['wrong date format', { date: '04.10.2026', amount: 1, description: 'x' }],
    ['float amount', { date: '2026-10-04', amount: 1.5, description: 'x' }],
    ['zero amount', { date: '2026-10-04', amount: 0, description: 'x' }],
    ['amount as string', { date: '2026-10-04', amount: '65000', description: 'x' }],
    ['empty description', { date: '2026-10-04', amount: 1, description: '   ' }],
  ])('rejects %s', (_name, input) => {
    expect(CreateExpenseSchema.safeParse(input).success).toBe(false);
  });
});

describe('UpdateExpenseSchema', () => {
  it('accepts a partial update', () => {
    expect(UpdateExpenseSchema.parse({ amount: 70_000 })).toEqual({ amount: 70_000 });
  });

  it('rejects an empty update', () => {
    expect(UpdateExpenseSchema.safeParse({}).success).toBe(false);
  });
});

describe('ListExpensesQuerySchema', () => {
  it('converts query strings and applies defaults', () => {
    expect(ListExpensesQuerySchema.parse({ page: '2' })).toEqual({ page: 2, pageSize: 50 });
  });

  it('rejects from > to', () => {
    expect(
      ListExpensesQuerySchema.safeParse({ from: '2026-10-05', to: '2026-10-01' }).success,
    ).toBe(false);
  });

  it('caps pageSize to protect the server', () => {
    expect(ListExpensesQuerySchema.safeParse({ pageSize: '10000' }).success).toBe(false);
  });
});
