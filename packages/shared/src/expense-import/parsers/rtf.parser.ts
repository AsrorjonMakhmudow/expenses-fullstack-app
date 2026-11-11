import { rtfToText } from '../lib/rtf-to-text.js';
import { createTextDocumentParser } from './text-document.parser.js';

/** Rich text from TextEdit, WordPad or Word ("Save as… Rich Text Format"). */
export const rtfParser = /* @__PURE__ */ createTextDocumentParser({
  id: 'rtf',
  label: 'Rich Text (.rtf)',
  extensions: ['.rtf'],
  // Every RTF file starts with "{\rtf". Anything else (e.g. a renamed .docx) is not readable.
  toText: ({ content }) => (content.trimStart().startsWith('{\\rtf') ? rtfToText(content) : null),
});
