/**
 * Plain text from a Markdown note (Obsidian, Bear, Notion export, …).
 *
 * Removes only the syntax that would hide a date or an expense line:
 *   "## 31.10.2026"        → "31.10.2026"
 *   "- **65.000** — non"    → "65.000 — non"
 *   "> 31\.10\.2026"        → "31.10.2026"
 * Numbered lists ("1. …") are left alone: "1." could be the start of an amount.
 */
const LINE_PREFIX = /^\s*(?:>\s?)*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]]\s+)?)?/;
const CODE_FENCE = /^\s*(?:```|~~~)/;
const EMPHASIS = /\*\*|__|~~|`/g;
const ESCAPE = /\\([\\`*_{}[\]()#+\-.!|>~])/g;

export function markdownToText(markdown: string): string {
  return markdown
    .split(/\r\n|\r|\n/)
    .map((line) =>
      CODE_FENCE.test(line)
        ? ''
        : line.replace(LINE_PREFIX, '').replace(EMPHASIS, '').replace(ESCAPE, '$1'),
    )
    .join('\n');
}
