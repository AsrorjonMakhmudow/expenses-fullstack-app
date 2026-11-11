/**
 * Plain text from an RTF document (TextEdit, WordPad, Word "Rich Text").
 *
 * Not a full RTF reader: it keeps only the visible text and the line breaks, which is all the
 * expense-note parser needs. Fonts, colours, styles, pictures and metadata are dropped.
 *
 * Handles what real editors write for Cyrillic and Uzbek text:
 * - `၀?` Unicode escapes (+ the `\ucN` fallback characters after them),
 * - `\'c0` bytes in the document's code page (`\ansicpg1251`, `\ansicpg1252`, …),
 * - `\par`, `\line` and TextEdit's "backslash + newline" as line breaks.
 */

/** Groups whose content is never visible text. */
const SKIPPED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'expandedcolortbl',
  'stylesheet',
  'listtable',
  'listoverridetable',
  'info',
  'pict',
  'object',
  'fldinst',
  'header',
  'headerl',
  'headerr',
  'headerf',
  'footer',
  'footerl',
  'footerr',
  'footerf',
  'footnote',
  'revtbl',
  'rsidtbl',
  'xmlnstbl',
  'themedata',
  'colorschememapping',
  'datastore',
  'latentstyles',
  'filetbl',
  'generator',
]);

const LINE_BREAKS = new Set(['par', 'line', 'sect', 'page', 'row']);

const SYMBOLS: Record<string, string> = {
  tab: '\t',
  cell: '\t',
  emdash: '—',
  endash: '–',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  bullet: '•',
  emspace: ' ',
  enspace: ' ',
  qmspace: ' ',
};

const CONTROL_WORD = /^([a-zA-Z]{1,32})(-?\d{1,10})? ?/;

interface GroupState {
  skip: boolean;
  /** How many fallback characters follow each `\uN` (`\ucN`, default 1). */
  uc: number;
}

export function rtfToText(rtf: string): string {
  let out = '';
  let bytes: number[] = [];
  let codePage = 1252;
  let state: GroupState = { skip: false, uc: 1 };
  const stack: GroupState[] = [];
  /** Fallback characters still to drop after the last `\uN`. */
  let fallbackToSkip = 0;

  const flushBytes = () => {
    if (bytes.length === 0) return;
    out += decodeCodePage(Uint8Array.from(bytes), codePage);
    bytes = [];
  };
  const emit = (text: string) => {
    if (state.skip) return;
    flushBytes();
    out += text;
  };
  /** One visible character (literal or `\'hh`) — unless it is a `\uN` fallback. */
  const consumesFallback = () => {
    if (fallbackToSkip === 0) return false;
    fallbackToSkip--;
    return true;
  };

  let i = 0;
  while (i < rtf.length) {
    const ch = rtf[i]!;

    if (ch === '{') {
      stack.push(state);
      state = { ...state };
      fallbackToSkip = 0;
      i++;
      continue;
    }
    if (ch === '}') {
      state = stack.pop() ?? state;
      fallbackToSkip = 0;
      i++;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      // Raw line breaks in RTF source are formatting, not text.
      i++;
      continue;
    }
    if (ch !== '\\') {
      if (!consumesFallback()) emit(ch);
      i++;
      continue;
    }

    // A backslash: control symbol (one character) or control word.
    const next = rtf[i + 1] ?? '';
    if (next === '\\' || next === '{' || next === '}') {
      if (!consumesFallback()) emit(next);
      i += 2;
      continue;
    }
    if (next === "'") {
      const byte = Number.parseInt(rtf.slice(i + 2, i + 4), 16);
      i += 4;
      if (consumesFallback() || state.skip || Number.isNaN(byte)) continue;
      bytes.push(byte);
      continue;
    }
    if (next === '*') {
      // "{\*\something …}" — an optional destination this reader doesn't know: skip it.
      state.skip = true;
      i += 2;
      continue;
    }
    if (next === '\n' || next === '\r') {
      // TextEdit writes a backslash at the end of each paragraph.
      emit('\n');
      i += 2;
      continue;
    }
    if (next === '~') emit(' ');
    else if (next === '_') emit('-');
    // "\-" (optional hyphen) and unknown symbols produce nothing.
    if (!/[a-zA-Z]/.test(next)) {
      i += 2;
      continue;
    }

    const match = CONTROL_WORD.exec(rtf.slice(i + 1, i + 50));
    if (!match) {
      i += 2;
      continue;
    }
    const [token, word = '', param] = match;
    const n = param === undefined ? undefined : Number(param);
    i += 1 + token.length;

    if (word === 'bin') {
      // Raw binary data follows (pictures) — jump over it.
      i += n ?? 0;
      continue;
    }
    if (SKIPPED_DESTINATIONS.has(word)) {
      state.skip = true;
      continue;
    }
    if (word === 'ansicpg' && n !== undefined) {
      flushBytes();
      codePage = n;
      continue;
    }
    if (word === 'uc' && n !== undefined) {
      state.uc = n;
      continue;
    }
    if (word === 'u' && n !== undefined) {
      emit(String.fromCharCode(n < 0 ? n + 65536 : n));
      fallbackToSkip = state.uc;
      continue;
    }
    if (LINE_BREAKS.has(word)) {
      emit('\n');
      continue;
    }
    const symbol = SYMBOLS[word];
    if (symbol !== undefined) emit(symbol);
    // Every other control word is formatting (\b, \fs24, \cf1, …): ignore it.
  }

  flushBytes();
  return out;
}

function decodeCodePage(bytes: Uint8Array, codePage: number): string {
  const label = codePage === 65001 ? 'utf-8' : `windows-${codePage}`;
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    // Unknown code page: Western European is the RTF default.
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
