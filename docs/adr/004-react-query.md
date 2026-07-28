# ADR-004: React Query as server-state manager

**Status:** Accepted
**Date:** 2026-07-28
**Authors:** Staff Frontend Engineer

## Context

`AppContext` (262 lines) managed both UI state and server state. It manually fetched data in a `useEffect`, stored results in `useState`, and provided CRUD functions that called `apiClient` directly. This caused:

- Duplicated loading/error logic across screens
- No automatic cache invalidation after mutations
- Unnecessary re-fetches on every render
- Mixing of concerns (API calls inside context)

## Decision

We adopted **TanStack React Query** (already installed) as the server-state layer, keeping `AppContext` only for UI state (`currentMonth`).

React Query hooks were created in `src/hooks/useApi.ts`:

- **Queries:** `useParamsQuery`, `useRecordsQuery`, `useExpensesQuery`, `usePayrollQuery`
- **Mutations:** `useCreateRecord`, `useUpdateRecord`, `useDeleteRecord`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`, `useUpdateParams`

Each mutation automatically invalidates affected queries on success (`invalidateQueries`), ensuring data consistency without manual state updates.

## Cache strategy

| Resource | staleTime | Rationale |
|----------|-----------|-----------|
| Params | 5 min | Rarely changes |
| Records | 30 sec | Changes frequently |
| Expenses | 30 sec | Changes frequently |
| Payroll | 5 min | Expensive calculation, data depends on records/expenses/params |

## Consequences

| Positive | Negative |
|----------|----------|
| Automatic cache invalidation on CRUD | Increased dependency on React Query |
| No more manual data fetching in useEffect | Slight learning curve for new devs |
| Loading/error states come for free via `isLoading`, `isError` | |
| AppContext reduced from 262 to 196 lines | |
