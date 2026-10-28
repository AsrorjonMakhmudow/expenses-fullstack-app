# Expenses App

Personal expense tracker: imports my Telegram "Saved Messages" expense notes
(`DD.MM.YYYY` then `amount - reason` lines) and shows spending by year, month and day.

- Architecture & roadmap: [`docs/architecture-plan.md`](docs/architecture-plan.md)
- Why things are the way they are: [`docs/adr/`](docs/adr/README.md)

## Structure

```
apps/              deployable apps (api — Phase 3, web — Phase 7, mobile — later)
packages/shared/   code shared by apps: schemas, types, parser, utilities
docs/              architecture plan + ADRs
```

## Requirements

- Node.js 24 (`nvm use` reads `.nvmrc`)
- pnpm (`npm install -g pnpm`)
- Docker Desktop or OrbStack (for PostgreSQL)

## Getting started

```bash
nvm use
pnpm install
cp .env.example .env     # then edit the password
pnpm db:up               # start PostgreSQL in Docker
pnpm check               # format check + lint + typecheck + tests
```

## Scripts

| Command                             | What it does                       |
| ----------------------------------- | ---------------------------------- |
| `pnpm test`                         | Runs tests in every package        |
| `pnpm typecheck`                    | TypeScript checks in every package |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                             |
| `pnpm format` / `pnpm format:check` | Prettier                           |
| `pnpm check`                        | Everything CI runs                 |
| `pnpm db:up` / `pnpm db:down`       | Start / stop PostgreSQL            |

## Golden rule

Built for change: every feature must be addable by adding a folder and removable by
deleting that folder plus one line. See ADR 0002.
