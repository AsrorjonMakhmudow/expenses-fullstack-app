# 0008. Import from .md, .rtf and .docx files

- Status: Accepted
- Date: 2026-11-10

## Context

Notes are not only in Telegram. The same lines ("31.10.2026", "700.000 — …") also live in
Markdown apps, TextEdit/WordPad (.rtf) and Word (.docx). ADR 0006 rejected everything except
`.json` and `.txt`.

## Decision

- **One note parser, many wrappers.** Each format only turns the file into plain text; the
  existing `parseExpenseText` (ADR 0004) does the rest. `createTextDocumentParser` builds such a
  parser from `{ id, label, extensions, toText }`.
  - `.md` / `.markdown`: strip headings, bullets, checkboxes, quotes, emphasis, escapes.
    Numbered lists stay (a "1." could be an amount). Line numbers are kept.
  - `.rtf`: small reader in `rtf-to-text.ts` — visible text and line breaks only; handles
    `\uN` + `\ucN` fallbacks, `\'hh` in the document code page (`\ansicpg1251`, …), TextEdit's
    backslash-newline paragraphs; skips font/colour tables, pictures, field codes.
  - `.docx`: our own small ZIP reader (`zip.ts`) finds `word/document.xml`; one line per
    paragraph; skips tab-stop definitions, deleted text and field codes.
    **No ZIP library.** fflate was used first, but `unzipSync` decompresses an entry fully before
    you can stop it (CVE-2026-122146, no fixed version): a 3 MB upload claiming a 1 KB size kept
    the server busy 3.3 s. Now the API passes `inflateRaw` = node:zlib `inflateRawSync` with
    `maxOutputLength` (10 MB): the same bomb is refused in ~20 ms. Shared stays dependency-free.
- `ImportInput` gains optional `bytes` (the original upload) and `inflateRaw` (supplied by the
  host); `.docx` needs both, text formats keep using `content`. A broken file → one `INVALID_FILE` error, nothing imported.
- All three map to `expenses.source = 'plain_text_import'`: same notes, no new database value.
- `IMPORT_FILE_EXTENSIONS` (import contract) feeds the web `<input accept>`. A registry test
  keeps it equal to what the parsers read, so the web app never bundles the parsers.
  The factory calls are marked `/* @__PURE__ */` for the same reason.
- Not supported: old binary `.doc`, `.pages`, `.odt`, PDF → 400 "Unsupported file type".

## Consequences

- Word/TextEdit often turn `'` into `’` ("o’tkazdim"). The description keeps what the file
  says, so the same note imported once from Telegram and once from Word is **not** detected as a
  duplicate. Normalizing apostrophes would change fingerprints → needs its own ADR (see 0006).
- A new text-like format = one small `toText` function + one registry line + one extension.
