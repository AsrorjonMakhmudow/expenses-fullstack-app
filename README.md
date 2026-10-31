# Expenses App

Personal expense tracker: imports my Telegram "Saved Messages" expense notes
(`DD.MM.YYYY` then `amount - reason` lines) and shows spending by year, month and day.

- Architecture & roadmap: [`docs/architecture-plan.md`](docs/architecture-plan.md)
- Why things are the way they are: [`docs/adr/`](docs/adr/README.md)

## Structure

```
apps/api/          backend — NestJS 12 + Drizzle ORM + PostgreSQL
apps/web/          frontend — React + Vite + TanStack Query + ECharts (Feature-Sliced Design)
packages/shared/   code shared by apps: API contract (Zod), parser, utilities
docs/              architecture plan + ADRs
docker/            database init scripts
```

## Requirements

- Node.js 24 (`nvm use` reads `.nvmrc`)
- pnpm (`npm install -g pnpm`)
- Docker Desktop or OrbStack (for PostgreSQL)

## Getting started

```bash
nvm use
pnpm install
cp .env.example .env     # then edit passwords and OWNER_EMAIL
pnpm db:up               # start PostgreSQL in Docker (also creates expenses_test)
pnpm db:migrate          # create the tables
pnpm dev:api             # terminal 1 → http://localhost:3000/api/v1/health
pnpm dev:web             # terminal 2 → http://localhost:5173  (the app)
```

Try it:

```bash
curl -X POST http://localhost:3000/api/v1/expenses \
  -H 'content-type: application/json' \
  -d '{"date":"2026-10-04","amount":65000,"description":"билайн"}'
curl 'http://localhost:3000/api/v1/expenses?from=2026-10-01&to=2026-10-31'
```

## Import your Telegram history

1. Telegram Desktop → Saved Messages → ⋮ → **Export chat history** → untick media → format **JSON**.
2. Put `result.json` into `data/` (git-ignored — your finances never go to GitHub).
3. With the API running:

```bash
# Preview — nothing is saved. Shows totals and every line it couldn't read.
curl -s -F file=@data/result.json http://localhost:3000/api/v1/imports/preview \
  | node -e "const r=JSON.parse(require('fs').readFileSync(0));console.log(r.summary);console.table(r.issues.map(i=>({code:i.code,line:i.rawLine})))"

# Import for real (safe to repeat: duplicates are skipped)
curl -s -F file=@data/result.json http://localhost:3000/api/v1/imports
```

## Scripts

| Command                                 | What it does                                      |
| --------------------------------------- | ------------------------------------------------- |
| `pnpm dev:api`                          | API in watch mode                                 |
| `pnpm dev:web`                          | Web app at http://localhost:5173                  |
| `pnpm test`                             | Unit tests in every package                       |
| `pnpm test:e2e`                         | API end-to-end tests (needs the database running) |
| `pnpm typecheck`                        | TypeScript checks in every package                |
| `pnpm lint` / `pnpm format`             | ESLint + FSD rules (Steiger) / Prettier           |
| `pnpm check`                            | format + lint + typecheck + unit tests            |
| `pnpm db:up` / `pnpm db:down`           | Start / stop PostgreSQL                           |
| `pnpm db:generate`                      | Create a SQL migration after changing `schema.ts` |
| `pnpm db:migrate`                       | Apply pending migrations                          |
| `pnpm --filter @expenses/api db:studio` | Browse the database in the browser                |

## API (v1)

| Method | Path                       | Notes                                                          |
| ------ | -------------------------- | -------------------------------------------------------------- |
| GET    | `/api/v1/health`           | App + database status                                          |
| GET    | `/api/v1/expenses`         | `?from&to` (YYYY-MM-DD), `?q`, `?page&pageSize`                |
| GET    | `/api/v1/expenses/:id`     |                                                                |
| POST   | `/api/v1/expenses`         | `{ date, amount, description }`                                |
| PATCH  | `/api/v1/expenses/:id`     | any subset of the fields above                                 |
| DELETE | `/api/v1/expenses/:id`     |                                                                |
| POST   | `/api/v1/imports/preview`  | multipart `file` — shows what would be imported, saves nothing |
| POST   | `/api/v1/imports`          | multipart `file` — imports (skips duplicates)                  |
| GET    | `/api/v1/imports`          | import history                                                 |
| DELETE | `/api/v1/imports/:id`      | undo an import                                                 |
| GET    | `/api/v1/stats/summary`    | `?from&to` — total, count, daily average                       |
| GET    | `/api/v1/stats/timeseries` | `?granularity=year\|month\|day&from&to` — gaps filled with 0   |
| GET    | `/api/v1/stats/top`        | `?from&to&limit` — biggest expenses                            |

> ⚠️ No login yet (Phase 6). Every request acts as `OWNER_EMAIL`. Do not deploy before Phase 6 —
> the API refuses to start with `NODE_ENV=production` until then.

## Golden rule

Built for change: every feature must be addable by adding a folder and removable by
deleting that folder plus one line. See ADR 0002.
