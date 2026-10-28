import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../../lib/date.js';
import { parseExpenseText } from './parse-expense-text.js';

// The exact note from the user's Telegram (04.10.2026).
const REAL_NOTE = `04.10.2026
65.000 - билайн номеримга ташадим
150.000 - Шахризодага уйига боришига нарсала оьердим Вохид акадан
200.000 - Шахризодага Асмо жияни туг кунига нарса олишига бердим
400.000 — #1 Фильтр сув биринчи ойлигини туладим
37.790 - олма маркетдан котта чорток ва савр куренные палочки олдим
69.000 - Дониер уртогим магазинибан Шахризовдв минералка, узимга эрталаб завтракга каймок, творог, Хадичага 10 та памперс олдим
69.000 - ойижоним карзларини бердим Вохид ака дуконига
25.000 - ойижонимга яшил олма олдим.`;

describe('parseExpenseText', () => {
  it('parses the real Telegram note', () => {
    const { expenses, issues } = parseExpenseText(REAL_NOTE);

    expect(issues).toEqual([]);
    expect(expenses).toHaveLength(8);
    expect(expenses.every((e) => e.date === '2026-10-04')).toBe(true);
    expect(expenses.reduce((sum, e) => sum + e.amount, 0)).toBe(1_015_790);
    expect(expenses[3]).toMatchObject({
      amount: 400_000,
      description: '#1 Фильтр сув биринчи ойлигини туладим',
      lineNumber: 5,
    });
  });

  it('applies each date to the lines below it', () => {
    const { expenses } = parseExpenseText('01.10.2026\n10.000 - нон\n02.10.2026\n20.000 - сут');
    expect(expenses.map((e) => [e.date, e.amount])).toEqual([
      ['2026-10-01', 10_000],
      ['2026-10-02', 20_000],
    ]);
  });

  it.each(['-', '–', '—', '−'])('accepts the %s dash, with or without spaces', (dash) => {
    const { expenses } = parseExpenseText(`04.10.2026\n65.000${dash}билайн\n65.000 ${dash} билайн`);
    expect(expenses).toHaveLength(2);
  });

  it('keeps two identical purchases on the same day (they are both real)', () => {
    const { expenses } = parseExpenseText('04.10.2026\n5.000 - нон\n5.000 - нон');
    expect(expenses).toHaveLength(2);
  });

  it('ignores empty lines and invisible characters', () => {
    const { expenses, issues } = parseExpenseText('\n\u200B04.10.2026\n\n  65.000 - билайн  \n\n');
    expect(issues).toEqual([]);
    expect(expenses[0]).toMatchObject({ amount: 65_000, description: 'билайн' });
  });

  describe('reports problems instead of guessing', () => {
    it('expense before any date → error', () => {
      const { expenses, issues } = parseExpenseText('65.000 - билайн');
      expect(expenses).toEqual([]);
      expect(issues).toMatchObject([
        { severity: 'error', code: 'EXPENSE_BEFORE_DATE', lineNumber: 1 },
      ]);
    });

    it('impossible date → error, and lines below are NOT attached to the previous date', () => {
      const { expenses, issues } = parseExpenseText(
        '01.10.2026\n10.000 - нон\n31.02.2026\n20.000 - сут',
      );
      expect(expenses).toHaveLength(1);
      expect(issues.map((i) => i.code)).toEqual(['INVALID_DATE', 'EXPENSE_BEFORE_DATE']);
    });

    it('ambiguous amount → error', () => {
      const { issues } = parseExpenseText('04.10.2026\n1.5 - такси');
      expect(issues).toMatchObject([
        { code: 'INVALID_AMOUNT', rawLine: '1.5 - такси', lineNumber: 2 },
      ]);
    });

    it('amount without description → error', () => {
      const { issues } = parseExpenseText('04.10.2026\n65.000 -');
      expect(issues).toMatchObject([{ code: 'MISSING_DESCRIPTION' }]);
    });

    it('free text → unrecognized line', () => {
      const { issues } = parseExpenseText('04.10.2026\nбугун куп харажат булди');
      expect(issues).toMatchObject([{ code: 'UNRECOGNIZED_LINE', lineNumber: 2 }]);
    });
  });

  describe('fallback date (Telegram message timestamp)', () => {
    const fallbackDate = '2026-10-05' as IsoDate;

    it('uses it when there is no date line, with ONE warning', () => {
      const { expenses, issues } = parseExpenseText('10.000 - нон\n20.000 - сут', { fallbackDate });
      expect(expenses.map((e) => e.date)).toEqual(['2026-10-05', '2026-10-05']);
      expect(issues).toMatchObject([{ severity: 'warning', code: 'DATE_FROM_MESSAGE' }]);
    });

    it('prefers the written date over the message timestamp', () => {
      const { expenses, issues } = parseExpenseText('04.10.2026\n10.000 - нон', { fallbackDate });
      expect(expenses[0]?.date).toBe('2026-10-04');
      expect(issues).toEqual([]);
    });
  });
});
