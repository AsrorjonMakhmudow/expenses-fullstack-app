import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { beforeEach, describe, expect, it } from 'vitest';
import { expenseSourceParsers } from '@expenses/shared';
import { ImportsService, SOURCE_BY_PARSER } from './imports.service.js';
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
    ['unsupported type (PDF)', txt('x', 'october.pdf')],
    ['broken Word file', txt('x', 'october.docx')],
    ['nothing to import', txt('just a note')],
  ])('rejects: %s', async (_name, file) => {
    await expect(service.commit(ME, file)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('strips the BOM that Windows editors add', async () => {
    const preview = await service.preview(ME, txt(`\uFEFF${OCTOBER}`));
    expect(preview.summary.parsed).toBe(3);
  });

  it('imports a real Word file (.docx, deflate-compressed) as plain-text notes', async () => {
    const file = {
      originalname: 'notes.docx',
      buffer: readFileSync(new URL('../../../test/fixtures/notes.docx', import.meta.url)),
    };

    const preview = await service.preview(ME, file);
    expect(preview.parser.id).toBe('docx');
    expect(preview.summary).toMatchObject({ parsed: 5, new: 5, errors: 0, newAmount: 1_190_000 });

    await service.commit(ME, file);
    expect(repository.batches[0]).toMatchObject({ parserId: 'docx' });
    expect(repository.expenses).toHaveLength(5);
  });

  it('refuses a zip bomb quickly: a small .docx that unpacks to 100 MB but claims 1 KB', async () => {
    const xml = Buffer.from('<w:p><w:r><w:t>0</w:t></w:r></w:p>'.repeat(3_000_000)); // ~100 MB
    const bomb = oneEntryZip('word/document.xml', deflateRawSync(xml, { level: 9 }), 1024);
    expect(bomb.length).toBeLessThan(500_000);

    const started = performance.now();
    const preview = await service.preview(ME, { originalname: 'bomb.docx', buffer: bomb });
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(preview.issues).toMatchObject([{ code: 'INVALID_FILE' }]);
    expect(preview.summary.parsed).toBe(0);
  });

  it('imports a Rich Text file (.rtf)', async () => {
    const rtf = String.raw`{\rtf1\ansi{\fonttbl\f0 Helvetica;}\f0 04.10.2026\par 65.000 \emdash  non\par}`;
    const preview = await service.preview(ME, txt(rtf, 'october.rtf'));
    expect(preview.parser.id).toBe('rtf');
    expect(preview.expenses.map((e) => e.description)).toEqual(['non']);
  });

  it('every registered parser has an expenses.source value', () => {
    for (const parser of expenseSourceParsers) expect(SOURCE_BY_PARSER[parser.id]).toBeDefined();
  });
});

/** A ZIP with one deflate entry whose header claims `declaredSize` (CRC left at 0). */
function oneEntryZip(name: string, compressed: Buffer, declaredSize: number): Buffer {
  const fileName = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(declaredSize, 22);
  local.writeUInt16LE(fileName.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(declaredSize, 24);
  central.writeUInt16LE(fileName.length, 28);
  const centralOffset = 30 + fileName.length + compressed.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + fileName.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, fileName, compressed, central, fileName, end]);
}
