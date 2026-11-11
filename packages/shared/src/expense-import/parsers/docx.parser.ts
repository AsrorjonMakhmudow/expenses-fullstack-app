import { docxToText } from '../lib/docx-to-text.js';
import { createTextDocumentParser } from './text-document.parser.js';

/** A Word document. Old binary .doc files are not supported — save them as .docx first. */
export const docxParser = /* @__PURE__ */ createTextDocumentParser({
  id: 'docx',
  label: 'Word (.docx)',
  extensions: ['.docx'],
  toText: ({ bytes, inflateRaw }) => (bytes ? docxToText(bytes, inflateRaw) : null),
});
