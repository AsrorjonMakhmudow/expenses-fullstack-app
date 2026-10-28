import { describe, expect, it } from 'vitest';
import * as shared from './index.js';

// Guards the "front door": if someone renames or forgets to export something the apps rely on,
// this test fails here instead of breaking apps/api or apps/web later.
describe('@expenses/shared public API', () => {
  it('exposes the expense import entry points', () => {
    expect(typeof shared.parseExpenseText).toBe('function');
    expect(typeof shared.findParser).toBe('function');
    expect(shared.expenseSourceParsers.map((p) => p.id)).toEqual(['telegram-json', 'plain-text']);
  });
});
