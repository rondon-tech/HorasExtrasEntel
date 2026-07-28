# ADR-002: Migration from "CREATE TABLE IF NOT EXISTS" to node-pg-migrate

**Status:** Accepted
**Date:** 2026-07-28
**Authors:** Database Architect

## Context

The original `api/index.js` contained an inline `initDB()` function that executed `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS` on every server start. This approach:

- Mixed DDL with application code
- Had no rollback capability
- Could not be versioned or reviewed independently
- Risked leaving the database in an inconsistent state if a query failed mid-execution

## Decision

We adopted **node-pg-migrate** for versioned, replayable schema management.

- Migration files live in `api/migrations/` (e.g., `001_initial-schema.js`).
- Each migration exports `up()` and `down()` functions.
- A standalone runner (`migrate.mjs`) applies migrations before deployment.
- The inline `initDB()` was removed from `api/index.js`.

The initial migration (`001_initial-schema.js`) captures the full current schema, including:
- Core tables (records, expenses, params)
- Performance indexes (date columns)
- Data integrity constraints (CHECK for day_type, extra_hours)

## Consequences

| Positive | Negative |
|----------|----------|
| Schema changes are auditable via git | Requires explicit migration step before deploy |
| Rollbacks are supported | Cannot auto-migrate on Vercel cold start (must run in CI or manually) |
| Future index/constraint changes are cleanly versioned | Learning curve for team unfamiliar with migration tools |
| Enables multi-environment parity (dev ↔ staging ↔ prod) | |

## Usage

```bash
npm run migrate          # apply pending migrations
npm run migrate:down     # rollback last migration
```
