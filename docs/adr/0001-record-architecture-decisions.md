# 0001. Record architecture decisions

- Status: Accepted
- Date: 2026-10-28

## Context

The app will be extended for years: features will be added, modified and removed.
Months later, nobody (including future me) will remember _why_ something was built a certain way.

## Decision

We keep Architecture Decision Records in `docs/adr/`.

## Consequences

- Every architectural change starts with a short ADR.
- Removing a feature is safer: its ADR explains what depends on it.
