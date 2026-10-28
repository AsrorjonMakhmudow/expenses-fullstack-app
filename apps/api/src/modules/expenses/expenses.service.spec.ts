import type { IsoDate } from '@expenses/shared';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExpensesService } from './expenses.service.js';
import { InMemoryExpensesRepository } from './testing/in-memory-expenses.repository.js';

const ME = 'user-me';
const SOMEONE_ELSE = 'user-other';
const day = (value: string) => value as IsoDate;

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(() => {
    // No Nest, no database: we hand the service a fake repository ourselves.
    // That's the payoff of depending on an abstraction.
    service = new ExpensesService(new InMemoryExpensesRepository());
  });

  it('creates and reads an expense', async () => {
    const created = await service.create(ME, {
      date: day('2026-10-04'),
      amount: 65_000,
      description: 'билайн',
    });
    expect(await service.get(ME, created.id)).toMatchObject({
      amount: 65_000,
      source: 'manual',
      currency: 'UZS',
    });
  });

  it('never shows one user the expenses of another (404, not 403)', async () => {
    const mine = await service.create(ME, {
      date: day('2026-10-04'),
      amount: 1,
      description: 'x',
    });
    await expect(service.get(SOMEONE_ELSE, mine.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.delete(SOMEONE_ELSE, mine.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.list(SOMEONE_ELSE, { page: 1, pageSize: 50 })).total).toBe(0);
  });

  it('updates only the given fields', async () => {
    const created = await service.create(ME, {
      date: day('2026-10-04'),
      amount: 1,
      description: 'нон',
    });
    const updated = await service.update(ME, created.id, { amount: 5_000 });
    expect(updated).toMatchObject({ amount: 5_000, description: 'нон' });
  });

  it('throws 404 for an unknown id', async () => {
    await expect(service.update(ME, 'missing', { amount: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
