import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { ImportsService } from './imports.service.js';
import { InMemoryImportsRepository } from './testing/in-memory-imports.repository.js';

const ME = 'user-me';

const txt = (content: string, name = 'october.txt') => ({
  originalname: name,
  buffer: Buffer.from(content, 'utf8'),
});

const OCTOBER = `04.10.2026
65.000 - билайн
5.000 - нон
5.000 - нон
1.5 - такси`;

describe('ImportsService', () => {
  let repository: InMemoryImportsRepository;
  let service: ImportsService;

  beforeEach(() => {
    repository = new InMemoryImportsRepository();
    service = new ImportsService(repository);
  });

  it('preview parses, reports problems and saves nothing', async () => {
    const preview = await service.preview(ME, txt(OCTOBER));

    expect(preview.parser.id).toBe('plain-text');
    expect(preview.summary).toMatchObject({
      parsed: 3,
      new: 3,
      duplicates: 0,
      errors: 1,
      newAmount: 75_000,
      firstDate: '2026-10-04',
      lastDate: '2026-10-04',
    });
    expect(preview.issues).toMatchObject([{ code: 'INVALID_AMOUNT', lineNumber: 5 }]);
    expect(repository.expenses).toHaveLength(0);
  });

  it('commit saves new expenses; importing the same file again is refused', async () => {
    const batch = await service.commit(ME, txt(OCTOBER));
    expect(batch.summary).toMatchObject({ new: 3, duplicates: 0 });
    expect(repository.expenses).toHaveLength(3);

    await expect(service.commit(ME, txt(OCTOBER))).rejects.toBeInstanceOf(ConflictException);
    expect(repository.expenses).toHaveLength(3);
  });

  it('a bigger export only adds what is new', async () => {
    await service.commit(ME, txt(OCTOBER));
    const preview = await service.preview(ME, txt(`${OCTOBER}\n05.10.2026\n20.000 - сут`));
    expect(preview.summary).toMatchObject({ parsed: 4, new: 1, duplicates: 3, newAmount: 20_000 });
    expect(preview.expenses.filter((e) => !e.duplicate).map((e) => e.description)).toEqual(['сут']);
  });

  it('undo removes the batch and its expenses', async () => {
    const batch = await service.commit(ME, txt(OCTOBER));
    await service.undo(ME, batch.id);
    expect(repository.expenses).toHaveLength(0);
    expect(await service.list(ME)).toEqual([]);
    await expect(service.undo(ME, batch.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['no file', undefined],
    ['unsupported type (Word)', txt('x', 'october.docx')],
    ['nothing to import', txt('just a note')],
  ])('rejects: %s', async (_name, file) => {
    await expect(service.commit(ME, file)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('strips the BOM that Windows editors add', async () => {
    const preview = await service.preview(ME, txt(`\uFEFF${OCTOBER}`));
    expect(preview.summary.parsed).toBe(3);
  });
});
