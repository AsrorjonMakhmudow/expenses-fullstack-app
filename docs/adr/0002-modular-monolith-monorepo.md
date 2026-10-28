# 0002. Modular monolith in a pnpm monorepo, built for change

- Status: Accepted
- Date: 2026-10-28

## Context

One user, one developer, low traffic, but many future features (Telegram bot, categories,
budgets, mobile app). Changes must be cheap and safe.

## Decision

- **One repository** (pnpm workspaces): `apps/api`, `apps/web`, later `apps/mobile`, and
  `packages/shared` for code used by more than one app (schemas, types, parser, utilities).
- **One deployable backend** split into feature modules (a _modular monolith_), not microservices.
- **Built for change** — every feature must pass the test:
  _"Can I add it by adding a folder, and remove it by deleting that folder + one line?"_
  - Feature = module (NestJS module / FSD slice).
  - Each module exposes a public API (`index.ts` or exported service); no deep imports.
  - Boundaries are enforced by linters in CI (steiger for web, dependency-cruiser for api),
    added when each app is created.
  - Extension points (Strategy + registry) only where change is likely: import sources,
    dashboard widgets, stats.
  - Feature flags to switch features on/off; versioned API (`/api/v1`); additive DB migrations
    (expand → migrate → contract).

## Consequences

- Simple to run and deploy (one API container + one database).
- Shared types and validation are written once (DRY) and used by web, api and mobile.
- Discipline is required: boundary rules must stay enforced, or the monolith turns into a "big ball of mud".
