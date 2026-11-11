import { describe, expect, it } from 'vitest';
import { markdownToText } from './markdown-to-text.js';

describe('markdownToText', () => {
  it('removes headings, bullets, checkboxes, quotes, emphasis and escapes', () => {
    const md = [
      '## 31.10.2026',
      '- **700.000** — Shaxrizodaga kurtka',
      '* [x] 260.000 - Xadichaga',
      '> 31\\.10\\.2026',
      '+ `125.000` — ~~shapka~~ sharf',
    ].join('\n');
    expect(markdownToText(md).split('\n')).toEqual([
      '31.10.2026',
      '700.000 — Shaxrizodaga kurtka',
      '260.000 - Xadichaga',
      '31.10.2026',
      '125.000 — shapka sharf',
    ]);
  });

  it('keeps line numbers (code fences become blank lines) and plain lines unchanged', () => {
    expect(markdownToText('```\n65.000 - non\n```')).toBe('\n65.000 - non\n');
    expect(markdownToText("65.000 - o'tkazdim")).toBe("65.000 - o'tkazdim");
  });
});
