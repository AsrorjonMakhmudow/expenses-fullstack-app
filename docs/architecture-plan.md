# Expenses App — Architecture & Roadmap (v3, 2026-10-28)

## Principle #1 — Built for change (applies to EVERY decision below)

The app will keep growing: features will be added, removed and modified. Every design choice must make change cheap and safe.
Test for every feature: **"Can I add it by adding a folder, and remove it by deleting that folder + one line?"**

### Mechanisms

| #   | Mechanism                              | How                                                                                                                               | What it buys us                                                                                 |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Feature = module                       | Backend: one NestJS module per feature (`modules/<feature>`). Frontend: one FSD slice (`features/<feature>`, `widgets/<widget>`). | Add = new folder; remove = delete folder + unregister.                                          |
| 2   | Public API per module                  | Each module exposes only `index.ts` (frontend) / exported service (backend). No deep imports into another module's internals.     | Internals can be rewritten without breaking others.                                             |
| 3   | Boundaries enforced by tools           | `steiger` (FSD linter) + ESLint import rules on web; `dependency-cruiser` on api; run in CI.                                      | Architecture can't silently rot.                                                                |
| 4   | Extension points (Strategy + registry) | `ExpenseSourceParser` registry (Telegram, text, Excel…), dashboard widget registry, stats granularity.                            | New variant = new class, zero edits to existing code (Open/Closed).                             |
| 5   | Domain events inside the monolith      | `@nestjs/event-emitter`: e.g. `expense.created` → budgets/notifications listen.                                                   | New features react to old ones without modifying them; removing a listener removes the feature. |
| 6   | Feature flags                          | Typed, validated config (`FEATURE_BUDGETS=true`); frontend reads `/config/features`.                                              | Turn features on/off without deleting code; ship unfinished work safely.                        |
| 7   | Contract-first API                     | Zod schemas in `packages/shared`; routes under `/api/v1`; additive changes only; breaking change → `/api/v2`.                     | Web and future mobile don't break when API evolves.                                             |
| 8   | Safe DB evolution                      | Prisma migrations, never edit old ones; expand → migrate data → contract (add new column, backfill, switch code, drop old later). | Schema changes without data loss or downtime.                                                   |
| 9   | Tests as safety net                    | Unit tests on parser/services, e2e on API, a few UI tests; CI blocks merge on failure.                                            | Modify with confidence.                                                                         |
| 10  | Decision log (ADRs)                    | `docs/adr/NNN-title.md`: context → decision → consequences.                                                                       | Future you knows why something exists before changing/removing it.                              |
| 11  | No premature abstraction (YAGNI)       | Extension points only where change is likely (sources, widgets, stats).                                                           | Flexibility without complexity.                                                                 |

### Checklists

**Add a feature:** ADR (if architectural) → shared Zod schema → backend module (+ migration) → register in `app.module.ts` → behind a feature flag → FSD slice/widget → tests → enable flag.
**Modify a feature:** read its ADR → change behind tests → additive API/DB changes (expand/contract) → update ADR.
**Remove a feature:** disable flag → delete frontend slice + backend module + unregister → migration to drop its tables (after backup) → remove flag → ADR "superseded".

## Source data

Telegram Saved Messages, plain text, since 2024:

```
04.10.2026
65.000 - билайн номеримга ташадим
400.000 — #1 Фильтр сув биринчи ойлигини туладим
```

Rule: date line `DD.MM.YYYY`, then lines `AMOUNT - description`. Amount uses `.` as thousands separator, currency UZS. Dash may be `-`, `–` or `—`.

## Key decisions

| Topic              | Decision                                                                                              | Why                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Monthly Word files | NO                                                                                                    | Manual, error-prone, Word = formatting not data. "Month" is a query (GROUP BY), not a storage unit. |
| Import format      | Telegram Desktop JSON export (+ pasted .txt). Excel/CSV later as extra parser. Word never.            | Zero manual work; same format you already write.                                                    |
| Long-term input    | Telegram bot writes directly to DB (later phase)                                                      | Keep your habit, no exports.                                                                        |
| Database           | PostgreSQL                                                                                            | Relational, exact money types, date_trunc/GROUP BY, constraints, free.                              |
| ORM                | Drizzle ORM + drizzle-kit migrations (was Prisma — see ADR 0005)                                      | SQL-first, pure TS, no native binaries.                                                             |
| Money              | BIGINT in so'm (integer)                                                                              | Floats lose precision (0.1+0.2).                                                                    |
| Backend            | Node.js 24 + TypeScript + NestJS 12 (ESM)                                                             | Modules + DI map directly to SOLID; scales with features.                                           |
| Architecture       | Modular monolith, API-first                                                                           | One app with clear rooms; web + future mobile share the API.                                        |
| Frontend           | Vite + React + TS, FSD, TanStack Query, React Router, react-hook-form + Zod, Apache ECharts, Tailwind |                                                                                                     |
| Repo               | pnpm monorepo: apps/api, apps/web, packages/shared (zod schemas, types, parser, money/date utils)     | DRY: one schema for front + back; parser reused.                                                    |
| Auth               | Single user, argon2 password hash, httpOnly session cookie                                            | Simple, secure; user_id kept in schema for future.                                                  |
| Deploy             | Cheap VPS + Docker Compose (api, postgres, caddy) + cheap domain, nightly pg_dump backups off-server  | Caddy gives free auto-HTTPS.                                                                        |

## Charts

- Year: KPI cards + bar chart (total per year).
- Month: column chart (12 months of selected year) + line chart comparing years.
- Day: calendar heatmap (GitHub style) + bar chart of days in selected month.
- Later (categories): horizontal bar chart (not pie).
- Plus: top-10 biggest expenses table.

## Database schema (v1)

- users(id uuid, email unique, password_hash, created_at)
- expenses(id uuid, user_id fk, spent_on date, amount bigint >0, currency char(3) default 'UZS', description text, source enum(telegram_import|manual|bot|excel), import_batch_id fk null, raw_line text null, dedupe_hash text, created_at, updated_at)
  - unique(user_id, dedupe_hash); index(user_id, spent_on)
  - dedupe_hash = sha256(date|amount|normalized description|n-th occurrence that day)
- import_batches(id, user_id, file_name, file_hash, status, total, imported, duplicates, failed, errors jsonb, created_at)
- categories (later), budgets (later)

## API (v1)

- POST /auth/login, POST /auth/logout, GET /auth/me
- GET /expenses?from&to&q&page, POST /expenses, PATCH /expenses/:id, DELETE /expenses/:id
- GET /stats/summary?from&to
- GET /stats/timeseries?granularity=year|month|day&from&to
- POST /imports/preview (multipart; parse only, returns rows/errors/duplicates)
- POST /imports (commit in one DB transaction), GET /imports

## Backend structure (NestJS)

```
apps/api/src/
  main.ts, app.module.ts
  config/            env validation (zod)
  common/            exception filter, guards, pipes, interceptors
  infra/database/    Drizzle schema, DB module, migrate script
  modules/
    auth/
    expenses/        controller → service → repository, dto
    stats/
    imports/
      parsers/       ExpenseSourceParser interface;
                     TelegramJsonParser, PlainTextParser, (XlsxParser later)
```

Layer rule: controller (HTTP only) → service (business rules) → repository (DB only).

## Frontend structure (FSD)

```
apps/web/src/
  app/       providers, router, global styles
  pages/     dashboard, expenses, import, login
  widgets/   kpi-cards, yearly-chart, monthly-chart, daily-heatmap, expenses-table, import-wizard
  features/  auth-by-password, filter-by-period, upload-file, add-expense, edit-expense
  entities/  expense, stats, user (types, api, small UI)
  shared/    api client, ui kit, lib (formatMoney, dates), config
```

Imports go only downward: app → pages → widgets → features → entities → shared.

## Roadmap

0. ✅ Setup: git, pnpm monorepo, TS strict, ESLint/Prettier, Docker Postgres, boundary linters (steiger, dependency-cruiser), `docs/adr/` with ADR-001, typed feature-flag config, CI running lint + tests.
1. ✅ Parser in packages/shared (pure TS, TDD with Vitest) — heart of the app.
2. Node fundamentals warm-up: raw node:http + Express version of one endpoint (optional learning exercise).
3. ✅ NestJS + Drizzle + Postgres: expenses CRUD, migrations, Zod validation, unit + e2e tests.
4. ✅ Imports: upload → preview → commit, dedupe fingerprints, one transaction, undo (ADR 0006).
5. ✅ Stats endpoints: summary, timeseries (year/month/day, gaps filled), top expenses.
6. Auth (argon2, sessions, guard, rate-limit login).
7. ✅ Frontend (before auth, by choice): FSD, dashboard charts, import wizard, expenses table (ADR 0007). Login page comes with Phase 6.
8. Deploy: Docker Compose, Caddy, domain, backups, GitHub Actions CI.
   9+. Telegram bot, categories (keyword rules), budgets, Excel export, mobile app (Expo, reusing packages/shared).

## Parser edge cases to test

dash variants (- – —); amounts 65.000 / 65 000 / 65000 / 1.250.000; date 4.10.2026; message with several dates; lines without amount (report, don't drop silently); message without date (warning); Telegram JSON `text` as string OR array of parts (hashtags like #1); trailing spaces/emoji; duplicate re-import.
