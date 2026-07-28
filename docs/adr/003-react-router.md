# ADR-003: React Router for frontend navigation

**Status:** Accepted
**Date:** 2026-07-28
**Authors:** Staff Frontend Engineer

## Context

The frontend used a `useState('dashboard')` + `switch` statement in `App.tsx` for navigation. This prevented:

- Deep linking (sharing a URL for a specific view)
- Browser back/forward navigation
- SEO / Open Graph previews
- Clean route-based code splitting

## Decision

We adopted **React Router v7** with declarative route definitions:

| Path | Component |
|------|-----------|
| `/` | Dashboard |
| `/record/:id?` | DailyRecord (optional id for editing) |
| `/expenses/:id?` | Expenses (optional id for editing) |
| `/records` | RecordsList |
| `/simulator` | Simulator |
| `/settings` | History |

Each route is wrapped in an `ErrorBoundary` component for resilient error handling.

The bottom navigation bar uses `useNavigate()` and `useLocation()` to determine active state, mimicking the previous tab-based UX.

## Consequences

| Positive | Negative |
|----------|----------|
| URLs are now shareable | Screens must use `useNavigate`/`useParams` instead of props |
| Browser navigation works correctly | Initial migration touched 8 screen components |
| Route-based lazy loading is now possible (future optimization) | |
| Error boundaries isolate crashes per-route | |

## Migration approach

We migrated incrementally: screens previously received `onNavigate` and `editingId` props. These were replaced with `useNavigate()` and `useParams()` from React Router, maintaining a compatible API surface throughout.
