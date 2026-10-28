# 0006. Import flow and de-duplication

- Status: Accepted
- Date: 2026-10-29

## Context

Years of Telegram notes must get into the database safely. The user will export again later
(a bigger file that overlaps the old one), may upload the same file twice by mistake, and must be
able to see what will happen _before_ anything is saved — and undo it afterwards.

## Decision

- **Two steps, stateless.** `POST /imports/preview` parses and compares with the database but
  saves nothing. `POST /imports` (same file again) parses **again on the server** and saves.
  The server never trusts parsed data sent back by a client, and there is no temporary state
  to store or expire.
- **Fingerprint per expense:** `sha256([date, amount, normalized description] + "#n")`, where
  `n` is the occurrence of that identical line within the file. Two breads on one day stay two
  expenses; re-importing reproduces the same fingerprints, so they are skipped.
  Stored in `expenses.dedupe_hash` with a unique index on `(user_id, dedupe_hash)`;
  inserts use `ON CONFLICT DO NOTHING`, so even two simultaneous uploads cannot duplicate.
- **One transaction per import:** the batch row and all its expenses are saved together or not at all.
- **`import_batches` table** keeps history (file name, SHA-256, parser, summary, problem lines).
  `expenses.import_batch_id … ON DELETE CASCADE` makes **undo** a single delete.
- Uploads: multipart field `file`, kept in memory, max 20 MB (`MAX_IMPORT_FILE_BYTES` in the
  shared contract), BOM stripped. Unsupported types (e.g. `.docx`) → 400.

## Consequences

- The imports repository writes to the `expenses` table, which belongs to the expenses module.
  Accepted on purpose: one transaction (consistency) matters more than module purity here.
- Editing an imported expense keeps its fingerprint, so a later re-import won't bring the old
  version back.
- If the parser's normalization changes, fingerprints of _new_ imports may change. Any such
  change needs a migration plan (new ADR).
