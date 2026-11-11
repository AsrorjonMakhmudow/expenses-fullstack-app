import { createTextDocumentParser } from './text-document.parser.js';

/** A .txt file, or text pasted/copied straight from Telegram. */
export const plainTextParser = /* @__PURE__ */ createTextDocumentParser({
  id: 'plain-text',
  label: 'Plain text (.txt)',
  extensions: ['.txt'],
  toText: ({ content }) => content,
});
