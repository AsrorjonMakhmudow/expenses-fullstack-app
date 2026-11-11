import { markdownToText } from '../lib/markdown-to-text.js';
import { createTextDocumentParser } from './text-document.parser.js';

/** Notes kept in a Markdown app (Obsidian, Bear, Notion export, …). */
export const markdownParser = /* @__PURE__ */ createTextDocumentParser({
  id: 'markdown',
  label: 'Markdown (.md)',
  extensions: ['.md', '.markdown'],
  toText: ({ content }) => markdownToText(content),
});
