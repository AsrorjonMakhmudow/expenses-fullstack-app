import type { InflateRaw } from '../model/types.js';
import { readZipEntry } from './zip.js';

/** A .docx is a ZIP archive; the body text lives in this one XML file. */
const DOCUMENT_XML = 'word/document.xml';

/**
 * Never unpack more than this, whatever size the file claims ("zip bomb" guard).
 * A year of expense notes is well under 1 MB of XML, so 10 MB is generous.
 */
export const MAX_DOCUMENT_XML_BYTES = 10 * 1024 * 1024;

/** Parts of a paragraph that are never visible text (tab stops, deleted text, field codes). */
const INVISIBLE = [
  /<w:pPr\b[\s\S]*?<\/w:pPr>/g,
  /<w:rPr\b[\s\S]*?<\/w:rPr>/g,
  /<w:delText\b[\s\S]*?<\/w:delText>/g,
  /<w:instrText\b[\s\S]*?<\/w:instrText>/g,
];

/**
 * Text runs, tabs, line breaks and paragraph ends, in document order.
 * `<w:t(?:\s…)?>` on purpose: a plain `<w:t[^>]*>` would also match `<w:tab/>`.
 */
const TOKEN =
  /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr|noBreakHyphen)(?:\s[^>]*)?\/>|<\/w:p>|<w:p(?:\s[^>]*)?\/>/g;

const ENTITY = /&(?:#(\d+)|#x([0-9a-fA-F]+)|(amp|lt|gt|quot|apos));/g;
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Plain text from a Word document (.docx), one paragraph per line.
 *
 * `inflateRaw` decompresses (the server passes node:zlib). It must throw instead of producing
 * more than `maxOutputBytes` — that is what makes a zip bomb cheap to refuse.
 * Returns null when the bytes are not a readable .docx (e.g. an old binary .doc renamed).
 */
export function docxToText(bytes: Uint8Array, inflateRaw?: InflateRaw): string | null {
  const entry = readZipEntry(bytes, DOCUMENT_XML);
  if (!entry) return null;

  let xml: Uint8Array;
  if (entry.method === 0) {
    xml = entry.data;
  } else {
    if (!inflateRaw) return null;
    try {
      xml = inflateRaw(entry.data, MAX_DOCUMENT_XML_BYTES);
    } catch {
      return null;
    }
  }
  if (xml.length > MAX_DOCUMENT_XML_BYTES) return null;
  return documentXmlToText(new TextDecoder().decode(xml));
}

/** Exported for tests: the XML → text step, without the ZIP around it. */
export function documentXmlToText(xml: string): string {
  let cleaned = xml;
  for (const pattern of INVISIBLE) cleaned = cleaned.replace(pattern, '');

  let out = '';
  for (const match of cleaned.matchAll(TOKEN)) {
    const [whole, text, empty] = match;
    if (text !== undefined) out += decodeXmlEntities(text);
    else if (empty === 'tab') out += '\t';
    else if (empty === 'noBreakHyphen') out += '-';
    else if (
      empty === 'br' ||
      empty === 'cr' ||
      whole.startsWith('</w:p') ||
      whole.startsWith('<w:p')
    )
      out += '\n';
  }
  return out;
}

function decodeXmlEntities(text: string): string {
  return text.replace(ENTITY, (entity, dec?: string, hex?: string, name?: string) => {
    if (dec !== undefined) return String.fromCodePoint(Number(dec));
    if (hex !== undefined) return String.fromCodePoint(Number.parseInt(hex, 16));
    return NAMED_ENTITIES[name ?? ''] ?? entity;
  });
}
