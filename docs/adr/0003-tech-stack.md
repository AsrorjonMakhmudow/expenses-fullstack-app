# 0003. Tech stack

- Status: Accepted
- Date: 2026-10-28

## Decision

| Area            | Choice                                             | Why                                                                                                                         |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Runtime         | Node.js 24 LTS (`.nvmrc`)                          | Long-term support; supported by NestJS, Prisma, Vitest                                                                      |
| Language        | TypeScript 6.0.x (strict)                          | Type safety. TS 7 is not yet supported by typescript-eslint (peer `<6.1`), so we stay on 6.0 until the ecosystem catches up |
| Package manager | pnpm (version pinned in `packageManager`)          | Fast, strict dependencies, first-class workspaces                                                                           |
| Tests           | Vitest                                             | Fast, TypeScript-native                                                                                                     |
| Lint / format   | ESLint (flat config) + typescript-eslint, Prettier | Catch bugs / stop style arguments                                                                                           |
| Database        | PostgreSQL 18 in Docker                            | Relational data, exact money types, strong date aggregation                                                                 |
| Backend         | NestJS + Prisma (Phase 3)                          | Modules + dependency injection map naturally to SOLID                                                                       |
| Frontend        | React + TypeScript + Vite, FSD (Phase 7)           |                                                                                                                             |
| CI              | GitHub Actions                                     | Runs format, lint, typecheck, tests on every push                                                                           |

## Consequences

- Upgrading TypeScript to 7 is a separate, deliberate change (new ADR) once tooling supports it.
- Money is always stored as an integer number of so'm (no floats).
