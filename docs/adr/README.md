# Architecture Decision Records (ADR)

An ADR is a short note that answers: **why did we decide this?**
Before you change or remove something important, read its ADR first.

Rules:

- One decision per file: `NNNN-short-title.md`, numbered in order.
- Never rewrite history. If a decision changes, write a new ADR and mark the old one `Superseded by NNNN`.
- Template: Status → Context → Decision → Consequences.

| #    | Title                                                                                      | Status                    |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------- |
| 0001 | [Record architecture decisions](0001-record-architecture-decisions.md)                     | Accepted                  |
| 0002 | [Modular monolith in a pnpm monorepo, built for change](0002-modular-monolith-monorepo.md) | Accepted                  |
| 0003 | [Tech stack](0003-tech-stack.md)                                                           | Accepted (ORM row → 0005) |
| 0004 | [Expense note format and parser](0004-expense-note-parser.md)                              | Accepted                  |
| 0005 | [API: NestJS 12 (ESM) + Drizzle ORM instead of Prisma](0005-api-nestjs-esm-and-drizzle.md) | Accepted                  |
| 0006 | [Import flow and de-duplication](0006-import-flow-and-deduplication.md)                    | Accepted                  |
| 0007 | [Frontend: React + Vite + Feature-Sliced Design](0007-frontend-fsd-react.md)               | Accepted                  |
