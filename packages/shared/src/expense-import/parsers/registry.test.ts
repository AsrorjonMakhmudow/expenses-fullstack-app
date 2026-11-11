import { describe, expect, it } from 'vitest';
import { IMPORT_FILE_EXTENSIONS } from '../../import/import.contract.js';
import { makeZip } from '../lib/testing/make-zip.js';
import { expenseSourceParsers, findParser } from './registry.js';

describe('findParser', () => {
  it.each([
    ['result.json', 'telegram-json'],
    ['RESULT.JSON', 'telegram-json'],
    ['october.txt', 'plain-text'],
    ['october.md', 'markdown'],
    ['October.Markdown', 'markdown'],
    ['october.rtf', 'rtf'],
    ['October.DOCX', 'docx'],
  ])('%s → %s', (fileName, expectedId) => {
    expect(findParser({ fileName, content: '' })?.id).toBe(expectedId);
  });

  it('returns null for unsupported files (e.g. old .doc, PDF)', () => {
    expect(findParser({ fileName: 'october.doc', content: '' })).toBeNull();
    expect(findParser({ fileName: 'october.pdf', content: '' })).toBeNull();
  });

  it('IMPORT_FILE_EXTENSIONS (upload picker) lists exactly what the parsers read', () => {
    expect(expenseSourceParsers.flatMap((parser) => parser.extensions)).toEqual(
      IMPORT_FILE_EXTENSIONS,
    );
  });
});

describe('document parsers (end to end: file → expenses)', () => {
  const NOTE = '31.10.2026\n700.000 — Shaxrizodaga kurtka\n260.000 — Xadichaga kurtka';
  const expected = [
    { date: '2026-10-31', amount: 700000, description: 'Shaxrizodaga kurtka' },
    { date: '2026-10-31', amount: 260000, description: 'Xadichaga kurtka' },
  ];
  const parse = (fileName: string, content: string, bytes?: Uint8Array) => {
    const input = { fileName, content, ...(bytes && { bytes }) };
    const result = findParser(input)!.parse(input);
    return {
      issues: result.issues,
      expenses: result.expenses.map(({ date, amount, description }) => ({
        date,
        amount,
        description,
      })),
    };
  };

  it('.md', () => {
    expect(
      parse(
        'notes.md',
        '# 31.10.2026\n- 700.000 — Shaxrizodaga kurtka\n- 260.000 — Xadichaga kurtka',
      ),
    ).toEqual({
      issues: [],
      expenses: expected,
    });
  });

  it('.rtf', () => {
    const rtf = `{\\rtf1\\ansi{\\fonttbl\\f0 Helvetica;}\\f0 ${NOTE.replaceAll('\n', '\\par\n').replaceAll('—', '\\emdash ')}}`;
    expect(parse('notes.rtf', rtf)).toEqual({ issues: [], expenses: expected });
  });

  it('.docx', () => {
    const body = NOTE.split('\n')
      .map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`)
      .join('');
    const bytes = makeZip([
      { name: 'word/document.xml', data: `<w:document><w:body>${body}</w:body></w:document>` },
    ]);
    expect(parse('notes.docx', '', bytes)).toEqual({ issues: [], expenses: expected });
  });

  it.each([
    ['broken.docx', 'not a zip', new TextEncoder().encode('not a zip')],
    ['no-bytes.docx', '', undefined],
    ['renamed.rtf', 'PK\u0003\u0004 binary', undefined],
  ])('%s → one INVALID_FILE error, nothing imported', (fileName, content, bytes) => {
    const { issues, expenses } = parse(fileName, content, bytes);
    expect(expenses).toEqual([]);
    expect(issues.map((issue) => issue.code)).toEqual(['INVALID_FILE']);
  });
});
