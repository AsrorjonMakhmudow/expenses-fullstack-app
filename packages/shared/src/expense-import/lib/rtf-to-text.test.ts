import { describe, expect, it } from 'vitest';
import { rtfToText } from './rtf-to-text.js';

const BACKSLASH = String.fromCharCode(92);

/**
 * RTF Unicode escapes for a word, e.g. "б" → backslash + "u1073".
 * Built in code because many editors silently turn a literal backslash-u escape into the character.
 * withFallback: Word style, each escape followed by its one-byte fallback (here: "?").
 */
function uEscapes(word: string, separator: string, withFallback = false): string {
  return [...word]
    .map((char) => `${BACKSLASH}u${char.charCodeAt(0)}${withFallback ? '?' : ''}`)
    .join(separator);
}

describe('rtfToText', () => {
  it('reads a macOS TextEdit file (backslash-newline paragraphs, \\uc0 Unicode)', () => {
    const rtf = String.raw`{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\pardirnatural\partightenfactor0

\f0\fs24 \cf0 31.10.2026\
700.000 \'97 Shaxrizodaga kurtka olishiga pul o'tkazib berdim\
65.000 - \uc0${uEscapes('билайн', ' ')}}`;

    expect(rtfToText(rtf).trim().split('\n')).toEqual([
      '31.10.2026',
      "700.000 — Shaxrizodaga kurtka olishiga pul o'tkazib berdim",
      '65.000 - билайн',
    ]);
  });

  it('reads Word/WordPad Unicode escapes and skips their fallback characters', () => {
    const rtf = String.raw`{\rtf1\ansi\ansicpg1251\uc1{\fonttbl{\f0 Calibri;}}{\*\generator Riched20;}
\pard 04.10.2026\par
65.000 \endash  ${uEscapes('билайн', '', true)}\par
}`;
    expect(rtfToText(rtf).trim().split('\n')).toEqual(['04.10.2026', '65.000 – билайн']);
  });

  it("decodes \\'hh bytes in the document code page (Cyrillic 1251)", () => {
    const rtf = String.raw`{\rtf1\ansi\ansicpg1251 150.000 - \'f5\'eb\'e5\'e1\par}`;
    expect(rtfToText(rtf).trim()).toBe('150.000 - хлеб');
  });

  it('keeps Uzbek apostrophes written as \\rquote and escaped braces', () => {
    const rtf = String.raw`{\rtf1 Xadichaga o\rquote tkazdim \{1\} \\ ok\line next}`;
    expect(rtfToText(rtf)).toBe('Xadichaga o’tkazdim {1} \\ ok\nnext');
  });

  it('drops pictures, field codes and other hidden groups', () => {
    const rtf = String.raw`{\rtf1{\info{\title Secret}}{\pict\pngblip 89504e47}{\field{\*\fldinst HYPERLINK "x"}{\fldrslt link}} 10.000 - non\par}`;
    expect(rtfToText(rtf).trim()).toBe('link 10.000 - non');
  });
});
