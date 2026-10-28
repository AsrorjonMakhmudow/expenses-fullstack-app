# 0004. Expense note format and parser

- Status: Accepted
- Date: 2026-10-28

## Context

Since 2024 expenses are written in Telegram Saved Messages as free text:

```
04.10.2026
65.000 - билайн номеримга ташадим
400.000 — #1 Фильтр сув биринчи ойлигини туладим
```

We need to turn years of these notes into structured data without manual retyping.

## Decision

- The parser lives in `packages/shared/src/expense-import` as **pure functions** (no I/O), so the
  browser can show a preview and the API can re-validate the same way (DRY).
- Grammar:
  - Date line: `D.M.YYYY` / `DD.MM.YYYY` (also `/`). Applies to all lines below it until the next date.
  - Expense line: `<amount> <dash> <description>`; any dash (`- – — −`), spaces optional.
  - Amount: whole so'm, thousands separated by `.`, `,` or spaces, or plain digits.
    `1.5` or `65.00` are **rejected as ambiguous** — we never guess money.
- **Report, don't guess.** Every problem becomes a `ParseIssue` with a stable `code`:
  - `error` = line not imported; `warning` = imported with an assumption.
  - An impossible date (31.02) resets the current date, so following lines are never attached to the wrong day.
- Telegram JSON export: `text` may be a string or an array of parts (hashtags, links) — parts are joined.
  If a message has no date line, the message timestamp is used with a `DATE_FROM_MESSAGE` warning.
  Messages that contain nothing that looks like a date or expense are skipped silently (links, photos, notes).
- Sources are pluggable: `ExpenseSourceParser` interface + `expenseSourceParsers` registry
  (Strategy pattern). Excel/CSV/bot = new parser file + one line in the registry.
- Identical lines on the same day are **both kept** (two breads are two breads). Duplicate _re-imports_
  are handled later by the API with a fingerprint (date, amount, description, n-th occurrence).

## Consequences

- Parser behavior is fully covered by unit tests; changing the grammar = change tests first.
- Real exports may reveal new patterns (income lines, currency words, comments). Each one gets a test
  and, if it changes the grammar, an update to this ADR.
