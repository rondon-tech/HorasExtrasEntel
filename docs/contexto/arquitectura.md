# Arquitectura

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React (TypeScript) | 19.2 |
| Bundler | Vite | 8.1 |
| Backend | Express (JavaScript + TypeScript parcial) | 5.2 |
| Base de datos | PostgreSQL (Neon.tech serverless) | 16 |
| ORM/Cliente | pg (raw SQL, sin ORM) | 8.22 |
| Auth | JWT + bcryptjs | 9.0 / 3.0 |
| Validación | Zod | 4.4 |
| Estado frontend | React Context + TanStack React Query | 5.101 |
| Testing | Vitest | 4.1 |
| Linter | Oxlint | 1.69 |
| Logging | Winston | 3.19 |
| Migraciones | node-pg-migrate | 9.0 |
| Despliegue | Vercel (serverless functions + edge middleware) | — |
| Backups | Cloudflare R2 (cada 2h vía GitHub Actions) | — |

## Mapa de carpetas

```
horas-extras-app/
├── api/                     # Entry point serverless (Express)
│   └── index.js             # 113 líneas, único archivo detectado por Vercel
├── server/                  # Backend lógico (importado por api/index.js)
│   ├── config/              # env.ts (validación), db.js (pool proxy), db-failover.js (dual-pool)
│   ├── controllers/         # HTTP handlers (auth, record, expense, params, payroll)
│   ├── mappers/             # DTOs: snake_case DB ↔ camelCase JS
│   ├── middlewares/         # auth, role, validate (Zod+XSS), errorHandler
│   ├── migrations/          # 4 migraciones versionadas (node-pg-migrate)
│   ├── repositories/        # Acceso a datos (raw SQL parametrizado)
│   ├── routes/              # Express routers
│   ├── schemas/             # Zod schemas (record, expense, params, auth, id-param)
│   ├── services/            # Lógica de negocio (payroll.service)
│   └── utils/               # logger (Winston), money (CLP), audit
├── src/                     # Frontend React
│   ├── api/                 # client.ts (Axios + JWT interceptor)
│   ├── components/          # ErrorBoundary, QuickAddModal, ConfirmDialog, HealthBanner, Spinner
│   ├── constants/           # tasks.ts (tareas, nemónicos, tipos de día)
│   ├── context/             # AuthContext (JWT), AppContext (estado global + React Query)
│   ├── hooks/               # useApi (queries/mutations), useHealthCheck, usePayrollPDF
│   ├── screens/             # Dashboard, DailyRecord, Expenses, RecordsList, Simulator, History, Login
│   └── utils/               # format (CLP), pdfGenerator, payrollPdfGenerator
├── scripts/                 # backup.mjs, restore.mjs, detect-anomalies.mjs, check-env.mjs
├── docs/                    # ADRs, api-spec.yaml
├── .github/workflows/       # CI, backup (cada 2h), restore
├── public/                  # PWA: manifest.json, sw.js (cache v2), favicon
├── middleware.ts             # Vercel Edge Middleware (rate limiting global)
├── vercel.json              # Rewrites: /api/* → api/index.js, /* → /
├── migrate.mjs              # Runner de migraciones
├── Dockerfile + docker-compose.yml
└── package.json
```

## Flujo de datos (request completo)

```
Navegador → Vercel Edge (middleware.ts: rate limit)
  → /api/* → api/index.js (Express serverless)
    → Helmet → CORS → compression → express.json
    → requireAuth (JWT verify)
    → validate (Zod + XSS sanitize)
    → controller → repository → pool.query() → Neon.tech PostgreSQL
    → mapper (snake→camel) → JSON response
  → /* → dist/index.html (SPA estática)
```

## Lo que NO existe

- **ORM** — usa SQL crudo con `pg`. [Decisión: ADR-001 descartó Prisma por MVP]
- **HttpOnly cookies** — JWT en localStorage. [Pendiente: migrar a cookies seguras]
- **Filtros server-side en records** — todo el filtrado es client-side en RecordsList.tsx
- **Endpoint de registro de usuarios** — solo login con fallback a credenciales de entorno
- **CD/CI automático a Vercel** — CI solo lint + test + build. Deploy manual con `vercel deploy`
- **Tests E2E** — solo tests unitarios (33 tests, 5 suites)
