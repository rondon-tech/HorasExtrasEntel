# ADR-001: Backend modularization with layered architecture

**Status:** Accepted
**Date:** 2026-07-28
**Authors:** Principal Architect, Staff Backend Engineer

## Context

The backend was a monolithic 401-line `api/index.js` file that mixed Express configuration, database initialization, route handlers, SQL queries, DTO mapping, and business logic in a single module. This violated separation of concerns and made the codebase difficult to test, maintain, and scale.

## Decision

We modularized the backend into four distinct layers, following a pragmatic interpretation of Clean Architecture adapted for serverless deployment:

```
api/
├── routes/         # Express routers (mounts middleware + controllers)
├── controllers/    # HTTP handlers (parse request, delegate, format response)
├── services/       # Business logic (pure functions, no HTTP/DB access)
└── repositories/   # Data access (PostgreSQL queries via shared pool)
```

Supporting modules:
- `api/config/` — environment validation (`env.js`) and shared database pool (`db.js`)
- `api/mappers/` — DTO transformers (snake_case ↔ camelCase)
- `api/middlewares/` — auth, validation, error handling
- `api/schemas/` — Zod validation schemas
- `api/migrations/` — versioned DB migrations (node-pg-migrate)

## Consequences

| Positive | Negative |
|----------|----------|
| Each layer can be tested in isolation | More files to navigate (offset by clearer names) |
| Routes/controllers can be refactored independently of DB | Initial extraction effort (~16h) |
| Repository pattern enables query optimization without touching business logic | Payroll service retains direct repository access (acceptable for MVP) |
| TypeScript can be adopted per file without big-bang migration | `allowJs` + `checkJs: false` defer type enforcement |

## Alternatives considered

1. **Keep monolith as-is:** Rejected — untestable, unmaintainable.
2. **Full DDD with aggregates:** Rejected — overkill for single-user MVP.
3. **Prisma ORM instead of raw pg:** Considered for future phase — adds schema management but hides query optimization.
