# 0005. API: NestJS 12 (ESM) + Drizzle ORM instead of Prisma

- Status: Accepted (supersedes the "ORM" row of ADR 0003)
- Date: 2026-10-28

## Context

Phase 3 builds the first backend. The plan said NestJS + Prisma.

- **NestJS 12** is ESM-only (`"type": "module"`). Compiled code must use real ES module imports,
  so relative imports end with `.js` even in `.ts` files (that's what Node will load after compiling).
- **Prisma 7** needs a native "schema engine" binary, downloaded from Prisma's servers, even
  for `prisma generate`. It also pulls a large dependency tree (Studio, React).
  In our build environment the download was blocked — the same thing can happen on a locked-down
  server or CI. We want a stack that works anywhere `npm install` works.

## Decision

- **NestJS 12, ESM**, compiled by `tsc` (`nest build`), with `NodeNext` module resolution.
- **Drizzle ORM + `pg` (node-postgres)**, migrations by **drizzle-kit**:
  - Pure TypeScript, no native binaries, small.
  - **SQL-first**: queries read like SQL (`select().from(expenses).where(...)`), so you learn
    real SQL instead of an ORM-specific language — a stated goal of this project.
  - Migrations are plain `.sql` files in `apps/api/drizzle/` that you review and commit.
- `@expenses/shared` is now **built** to `dist/` (`tsc`) and consumed as normal JS by the API;
  root scripts build it first (`pnpm build:shared`).
- Validation uses **Zod schemas from `@expenses/shared`** through a tiny `ZodValidationPipe`
  (no class-validator): one set of rules for web, API and mobile.
- Repository pattern: `ExpensesRepository` (abstract) → `DrizzleExpensesRepository`.
  Unit tests use `InMemoryExpensesRepository`; e2e tests use a real test database.
- Until Phase 6 a **temporary dev-owner guard** marks every request as the single owner
  (`OWNER_EMAIL`). The app refuses to start with it when `NODE_ENV=production`.

## Consequences

- Changing the ORM again only touches `infra/database/` and `*.repository.ts` files.
- Every relative import in ESM packages needs a `.js` extension — the compiler enforces it.
- Prisma Studio is replaced by `drizzle-kit studio`.
