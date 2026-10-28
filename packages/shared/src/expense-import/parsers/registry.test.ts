import { describe, expect, it } from 'vitest';
import { findParser } from './registry.js';

describe('findParser', () => {
  it.each([
    ['result.json', 'telegram-json'],
    ['RESULT.JSON', 'telegram-json'],
    ['october.txt', 'plain-text'],
  ])('%s → %s', (fileName, expectedId) => {
    expect(findParser({ fileName, content: '' })?.id).toBe(expectedId);
  });

  it('returns null for unsupported files (e.g. Word)', () => {
    expect(findParser({ fileName: 'october.docx', content: '' })).toBeNull();
  });
});
