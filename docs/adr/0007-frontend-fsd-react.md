# 0007. Frontend: React + Vite + Feature-Sliced Design

- Status: Accepted
- Date: 2026-10-29

## Context

The web app shows charts by year, month and day, a searchable list of expenses, and the
import flow. It must stay easy to extend (new charts, categories, budgets, login) and to shrink.

## Decision

- **Vite 8 + React 19 + TypeScript**, Tailwind CSS 4 with design tokens defined once in
  `app/styles/index.css` (light + dark).
- **TanStack Query** for all server data (cache, refetch, loading/error states).
  Every write invalidates by query key (`expenseKeys.all`, `statsKeys.all`, …).
- **React Router** with `lazy` routes: each page is a separate download.
- **Apache ECharts** via a 40-line wrapper (`shared/ui/chart`), with only the used chart types
  registered. It lives in its own entry point so only the dashboard downloads it.
- **Feature-Sliced Design**, imports only go downward:
  `app → pages → widgets → features → entities → shared`.
  - `entities/` — data + API: `expense`, `spending` (stats), `import-batch`
  - `features/` — user actions: `add-expense`, `delete-expense`, `import-expenses`, `select-year`
  - `widgets/` — self-contained blocks: charts, tables, KPI tiles, app shell
  - `pages/` — only compose widgets
  - Every slice exposes a public `index.ts`; nothing imports a slice's internals.
- **Steiger** (FSD linter) runs in `pnpm lint` and CI. Rule `fsd/insignificant-slice` is off on
  purpose: we keep one-use widgets/features as separate slices so each can be added or removed
  as one folder (ADR 0002).
- The API is reached through Vite's proxy (`/api` → `localhost:3000`): same origin, no CORS.
- Forms validate with the **same Zod schemas** as the API (instant feedback); the API still
  re-validates (client validation is UX, not security).
- Chart colors come from a validated, color-blind-safe palette (`shared/config/chart-theme.ts`);
  the heatmap is one hue, light → dark.

## Consequences

- New chart = new widget + one line in the dashboard page.
- The dashboard chunk is ~600 kB (ECharts); other pages don't load it.
- No login screen yet — the app must not be deployed before Phase 6.
