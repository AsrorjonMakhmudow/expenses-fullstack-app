import { describe, expect, it } from 'vitest';
import { MAX_DOCUMENT_XML_BYTES, documentXmlToText, docxToText } from './docx-to-text.js';
import { makeZip } from './testing/make-zip.js';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const paragraph = (...runs: string[]) =>
  `<w:p w:rsidR="00A1"><w:pPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr>${runs
    .map((run) => `<w:r><w:rPr><w:b/></w:rPr>${run}</w:r>`)
    .join('')}</w:p>`;
const documentXml = (...paragraphs: string[]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${paragraphs.join(
    '',
  )}<w:sectPr/></w:body></w:document>`;

/** A minimal .docx: a ZIP with the parts Word always writes (stored, not compressed). */
function makeDocx(xml: string): Uint8Array {
  return makeZip([
    { name: '[Content_Types].xml', data: '<Types/>' },
    { name: '_rels/.rels', data: '<Relationships/>' },
    { name: 'word/document.xml', data: xml },
  ]);
}

describe('docxToText', () => {
  it('returns one line per paragraph, joining runs Word split mid-word', () => {
    const xml = documentXml(
      paragraph('<w:t>31.10.2026</w:t>'),
      paragraph(
        '<w:t xml:space="preserve">700.000 — Shaxrizodaga </w:t>',
        '<w:t>kur</w:t>',
        '<w:t>tka</w:t>',
      ),
      paragraph('<w:t>125.000 - Xadichaga o’tkazdim</w:t>'),
    );
    expect(docxToText(makeDocx(xml))).toBe(
      '31.10.2026\n700.000 — Shaxrizodaga kurtka\n125.000 - Xadichaga o’tkazdim\n',
    );
  });

  it('ignores tab-stop definitions but keeps real tabs and line breaks', () => {
    const xml = documentXml(
      paragraph('<w:t>65.000</w:t>', '<w:tab/>', '<w:t>- non</w:t>', '<w:br/>', '<w:t>x</w:t>'),
    );
    expect(documentXmlToText(xml)).toBe('65.000\t- non\nx\n');
  });

  it('decodes XML entities and skips deleted (tracked-change) text', () => {
    const xml = documentXml(
      paragraph(
        '<w:t>10.000 - choy &amp; non &#1093;&#x43B;&lt;</w:t>',
        '<w:del><w:r><w:delText>OLD</w:delText></w:r></w:del>',
      ),
    );
    expect(documentXmlToText(xml)).toBe('10.000 - choy & non хл<\n');
  });

  it('treats empty paragraphs as blank lines', () => {
    expect(
      documentXmlToText(
        documentXml(paragraph('<w:t>a</w:t>'), '<w:p/>', paragraph('<w:t>b</w:t>')),
      ),
    ).toBe('a\n\nb\n');
  });

  it('returns null for files that are not a .docx', () => {
    const text = new TextEncoder().encode('just text, renamed to .docx');
    expect(docxToText(text)).toBeNull();
    expect(docxToText(makeZip([{ name: 'other.xml', data: '<x/>' }]))).toBeNull();
  });
});

describe('docxToText with compressed entries (method 8)', () => {
  const xml = documentXml(paragraph('<w:t>65.000 - non</w:t>'));
  // The "compressed" bytes are the XML itself; the fake decompressor just returns them.
  const compressed = makeZip([{ name: 'word/document.xml', data: xml, method: 8 }]);
  const identity = (data: Uint8Array) => data;

  it('decompresses with the inflateRaw it is given, passing the size limit', () => {
    let limit = 0;
    const text = docxToText(compressed, (data, max) => {
      limit = max;
      return identity(data);
    });
    expect(text).toBe('65.000 - non\n');
    expect(limit).toBe(MAX_DOCUMENT_XML_BYTES);
  });

  it('returns null without a decompressor, or when it refuses (zip bomb)', () => {
    expect(docxToText(compressed)).toBeNull();
    expect(
      docxToText(compressed, () => {
        throw new RangeError('Cannot create a Buffer larger than maxOutputLength');
      }),
    ).toBeNull();
  });

  it('returns null if a decompressor ignores the limit', () => {
    const tooBig = () => new Uint8Array(MAX_DOCUMENT_XML_BYTES + 1);
    expect(docxToText(compressed, tooBig)).toBeNull();
  });
});
