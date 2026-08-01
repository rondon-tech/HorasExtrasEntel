# Estado del Proyecto — Horas Extras Entel

> **Última actualización:** 1 de agosto de 2026
> **Responsable:** Ablutech
> **Repositorio:** https://github.com/rondon-tech/HorasExtrasEntel

---

## 1. Resumen del Proyecto

**Horas Extras Entel** es una aplicación web full-stack para que técnicos de campo de Entel Chile registren horas extras, viáticos y días TAD/Contingencia, y obtengan automáticamente el cálculo de su liquidación de sueldo según la legislación laboral chilena.

### Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React | 19.2 |
| Build | Vite | 8.1 |
| Lenguaje FE | TypeScript | 6.0 |
| Lenguaje BE | TypeScript (migración parcial) / JavaScript | — |
| Backend | Express | 5.2 |
| ORM/Cliente DB | pg (raw SQL) | 8.22 |
| Autenticación | JWT + bcrypt | 9.0 / bcryptjs |
| Validación | Zod | 4.4 |
| Estado FE | React Context + TanStack React Query | 5.101 |
| Testing | Vitest | 4.1 |
| Despliegue | Vercel (serverless) | — |
| Base de datos | PostgreSQL (Neon.tech serverless) | 16 |
| Backups | Cloudflare R2 (cada 2 horas) | — |
| CI/CD | GitHub Actions | — |

---

## 2. Estado Actual

### ✅ En producción

| Componente | Plataforma | Estado |
|-----------|-----------|--------|
| Frontend | Vercel (https://horas-extras.vercel.app) | ✅ Desplegado |
| Backend API | Vercel (serverless functions) | ✅ Desplegado |
| Base de datos primaria | Neon.tech — `hhee-entel` | ✅ Operativa |
| Base de datos fallback | Neon.tech — `horas-extras-fallback` | ✅ Migrada, standby |
| Backups automáticos | Cloudflare R2 — `backups-app-hhee-entel` | ✅ Cada 2 horas |
| CI pipeline | GitHub Actions | ✅ Lint → typecheck → test → build |
| PoolManager failover | `api/config/db-failover.js` | ✅ Listo (requiere `DATABASE_URL_FALLBACK` en Vercel) |

### ⚠️ Requiere acción humana

| Pendiente | Prioridad | Responsable |
|-----------|-----------|-------------|
| Configurar env vars en Vercel (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `FRONTEND_URL`, `DATABASE_URL_FALLBACK`) | Alta | DevOps |
| Habilitar PWA offline con dominio HTTPS | Media | Frontend |
| Migrar backend restante a TypeScript | Media | Backend |
| Tests E2E con Playwright | Baja | QA |
| Accesibilidad WCAG 2.1 AA | Baja | UX/Frontend |

---

## 3. Arquitectura

```
┌──────────────────────────────────────────────────────────────────────┐
│                          PRODUCCIÓN                                   │
│                                                                       │
│  ┌──────────┐                                                        │
│  │  Usuario  │──── Navegador ────▶ Vercel (serverless)               │
│  │  (móvil)  │                     │                                  │
│  └──────────┘                     ├── Frontend: Vite SPA              │
│                                   │   (React 19 + React Router 7)    │
│                                   │                                  │
│                                   ├── Backend: Express 5              │
│                                   │   (api/index.js, 112 líneas)     │
│                                   │   • 5 routers modulares           │
│                                   │   • PoolManager failover          │
│                                   │                                  │
│                                   └── Database:                      │
│                                       ├── Neon #1 (primario)         │
│                                       │   hhee-entel                 │
│                                       └── Neon #2 (fallback)         │
│                                           horas-extras-fallback      │
│                                                                       │
│  ┌────────────────────┐                                              │
│  │  GitHub Actions     │                                              │
│  │  • Backup cada 2h   │───── dump + gzip + upload ────▶ R2          │
│  │  • CI (lint/test)   │         backups-app-hhee-entel              │
│  └────────────────────┘                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Estructura del repositorio

```
horas-extras-app/
├── api/                        # Backend Express (TypeScript + JS)
│   ├── index.js                # Entry point (112 líneas)
│   ├── config/                 # env.ts, db.js, db-failover.js
│   ├── routes/                 # auth, records, expenses, params
│   ├── controllers/            # 5 controladores
│   ├── repositories/           # record, expense, params
│   ├── services/               # payroll (cálculo de liquidación)
│   ├── mappers/                # DTOs + tipos TypeScript
│   ├── middlewares/            # auth, role, validate, errorHandler
│   ├── schemas/                # Zod schemas
│   ├── migrations/             # 4 migraciones versionadas
│   └── utils/                  # money.ts, logger, audit
├── src/                        # Frontend React + TypeScript
│   ├── screens/                # 6 pantallas (lazy loaded)
│   ├── hooks/                  # useApi, usePayrollPDF
│   ├── components/             # ErrorBoundary, QuickAddModal
│   ├── context/                # AuthContext, AppContext
│   ├── constants/              # tasks, nemónicos
│   └── utils/                  # formatCLP, PDF generators
├── scripts/                    # backup.mjs, restore.mjs, detect-anomalies.mjs
├── docs/                       # 4 ADRs + OpenAPI spec + PROJECT_STATUS.md
├── .github/workflows/          # backup.yml, restore.yml, ci.yml
├── Dockerfile                  # Multi-stage Node 22
├── docker-compose.yml          # Backend + PostgreSQL local
├── public/                     # PWA manifest + service worker
├── .env.example                # Template de variables de entorno
├── migrate.mjs                 # Runner de migraciones
└── vercel.json                 # Rewrites para Vercel
```

---

## 4. Base de Datos

### Esquema

| Tabla | Propósito | Filas actuales |
|-------|-----------|----------------|
| `records` | Registros diarios de horas extras | — |
| `expenses` | Viáticos (bonos de gestión) | — |
| `params` | Parámetros de cálculo (single-row) | 1 |
| `users` | Autenticación (bcrypt) | — |
| `audit_log` | Auditoría de cambios | — |
| `pgmigrations` | Registro de migraciones | 4 |

### Migraciones aplicadas

| # | Nombre | Descripción |
|---|--------|-------------|
| 001 | `initial-schema` | Tablas core + índices + constraints |
| 002 | `users-table` | Tabla de usuarios con bcrypt |
| 003 | `audit-log` | Registro de auditoría |
| 004 | `params-audit` | Columna `updated_at` en params |

### Índices

| Índice | Tabla | Columna |
|--------|-------|---------|
| `idx_records_date` | records | date |
| `idx_expenses_date` | expenses | date |
| `idx_records_date_month` | records | EXTRACT(YEAR, MONTH) |
| `idx_audit_entity` | audit_log | entity, entity_id |

---

## 5. API Endpoints

| Método | Ruta | Auth | Rate Limit | Descripción |
|--------|------|------|------------|-------------|
| `POST` | `/api/login` | ❌ | 5/15min | Login (JWT) |
| `GET` | `/api/health` | ❌ | No | Health check |
| `GET` | `/api/params` | ✅ | No | Obtener parámetros |
| `PUT` | `/api/params` | ✅ `admin` | No | Actualizar parámetros |
| `GET` | `/api/records?limit=&offset=` | ✅ | No | Listar registros (paginado) |
| `POST` | `/api/records` | ✅ | No | Crear registro |
| `PUT` | `/api/records/:id` | ✅ | No | Actualizar registro |
| `DELETE` | `/api/records/:id` | ✅ | No | Eliminar registro |
| `GET` | `/api/expenses` | ✅ | No | Listar viáticos |
| `POST` | `/api/expenses` | ✅ | No | Crear viático |
| `PUT` | `/api/expenses/:id` | ✅ | No | Actualizar viático |
| `DELETE` | `/api/expenses/:id` | ✅ | No | Eliminar viático |
| `GET` | `/api/payroll/:year/:month` | ✅ | No | Calcular liquidación |

> Documentación completa en [`docs/api-spec.yaml`](docs/api-spec.yaml) (OpenAPI 3.1)

---

## 6. Seguridad

### Medidas implementadas

| Medida | Archivo/Paquete | Estado |
|--------|----------------|--------|
| Helmet (CSP, HSTS, X-Frame, etc.) | `helmet` | ✅ |
| Rate limiting en login | `express-rate-limit` (5/15min) | ✅ |
| Sanitización XSS de inputs | `xss` en middleware validate | ✅ |
| CORS restrictivo | Config manual en `api/index.js` | ✅ |
| Validación de env vars | `api/config/env.ts` (crash si falta) | ✅ |
| SSL enforce en producción | `Pool` config condicional | ✅ |
| JWT + roles | `requireAuth` + `requireRole` middlewares | ✅ |
| Bcrypt password hashing | `bcryptjs` en auth controller | ✅ |
| Audit logging | Tabla `audit_log` + controllers | ✅ |
| Body size limit | `express.json({ limit: '1mb' })` | ✅ |
| Gzip compression | `compression` middleware | ✅ |
| Gitignore sin `.env` | `.gitignore` validado | ✅ |

### Mejoras pendientes

| Mejora | Prioridad |
|--------|-----------|
| HttpOnly cookies para JWT (requiere dominio en Vercel) | Media |
| CSP más restrictiva (`unsafe-inline` → hashes) | Baja |
| Rate limiting global (no solo login) | Baja |

---

## 7. Infraestructura y URLs

### Producción

| Recurso | URL / Identificador |
|---------|---------------------|
| Repositorio | https://github.com/rondon-tech/HorasExtrasEntel |
| Vercel (frontend + backend) | https://horas-extras.vercel.app (o la asignada) |
| Neon #1 (primario) | `hhee-entel` — `ep-bold-credit-...us-east-1` |
| Neon #2 (fallback) | `horas-extras-fallback` — `ep-rough-fire-...us-east-2` |
| Cloudflare R2 | `backups-app-hhee-entel` |
| R2 endpoint S3 | `https://bceccbfc7f327423659142ddafd37012.r2.cloudflarestorage.com` |

### GitHub Actions

| Workflow | URL | Disparador |
|----------|-----|------------|
| Backup a R2 | [backup.yml](.github/workflows/backup.yml) | Cada 2 horas + manual |
| Restore desde R2 | [restore.yml](.github/workflows/restore.yml) | Manual |
| CI (lint → test → build) | [ci.yml](.github/workflows/ci.yml) | Push + PR a main |

### Monitoreo

| Recurso | URL |
|---------|-----|
| GitHub Actions dashboard | https://github.com/rondon-tech/HorasExtrasEntel/actions |
| Último backup | Ejecutar workflow manualmente o revisar Actions |

---

## 8. Testing

### Cobertura actual

| Suite | Tests | Archivo |
|-------|-------|---------|
| Money utility | 5 | `api/utils/money.test.js` |
| Payroll service | 5 | `api/services/payroll.service.test.js` |
| Mappers (DTOs) | 7 | `api/mappers/index.test.js` |
| Repositories | 9 | `api/repositories/index.test.js` |
| Auth + Role middlewares | 7 | `api/middlewares/auth.test.js` |
| **Total** | **33** | 5 archivos |

### Cómo ejecutar

```bash
npm test          # Ejecutar todos los tests
npm run lint     # Linter (Oxlint)
npm run build    # Compilar TypeScript + Vite
npm run typecheck # TypeScript backend check
```

---

## 9. Scripts Disponibles

```bash
# Desarrollo
npm run dev         # Frontend Vite (localhost:5173)
npm run server      # Backend Express con tsx (localhost:3001)

# Base de datos
npm run migrate     # Aplicar migraciones pendientes
npm run migrate:down # Revertir última migración

# Backup / Restore
npm run backup      # Dump Neon → R2
npm run restore     # R2 → restaurar en DATABASE_URL_FALLBACK

# Calidad
npm run lint        # Oxlint
npm run typecheck   # TypeScript backend
npm test            # Vitest (33 tests)
npm run build       # Compilar para producción
```

---

## 10. Changelog de Avances

### 1 de agosto de 2026 — Plan Maestro de Remediación completado

**Fase 1 — Seguridad:**
- [x] Credenciales de BD aisladas (`.env` ignorado, `.env.example` creado)
- [x] Helmet + CSP + rate limiting + sanitización XSS + CORS restrictivo
- [x] Todos los secretos hardcodeados eliminados (`dev-secret-key-12345`, `admin/password123`)
- [x] SSL verification condicionado a producción
- [x] Validación centralizada de variables de entorno

**Fase 2 — Backend:**
- [x] Arquitectura modular 5 capas (routes → controllers → services → repos → mappers)
- [x] `api/index.js`: 401 → 112 líneas (-72%)
- [x] 4 migraciones DB versionadas con node-pg-migrate
- [x] Índices + constraints de integridad
- [x] TypeScript parcial (env.ts, money.ts, mappers/index.ts)
- [x] Health check endpoint
- [x] Tests backend: 8 → 33 (+312%)

**Fase 3 — Frontend:**
- [x] React Router 7 con 6 rutas declarativas + deep linking
- [x] AppContext refactorizado a React Query (cache automático, invalidación)
- [x] 0 `alert()` en código — reemplazados por react-hot-toast
- [x] ErrorBoundary en cada ruta
- [x] PDF hook compartido (`usePayrollPDF`)
- [x] Lazy loading: bundle de 1.2 MB → 253 KB

**Fase 4 — DevOps:**
- [x] Dockerfile + docker-compose.yml
- [x] GitHub Actions CI (lint → typecheck → test → build)
- [x] Compresión gzip en Express
- [x] API pagination (`/api/records?limit=&offset=`)
- [x] 4 ADRs documentados
- [x] OpenAPI spec (`docs/api-spec.yaml`)

**Fase 5 — Seguridad avanzada + Backup:**
- [x] bcrypt hash de contraseñas (tabla `users` con migración)
- [x] Audit logging (tabla `audit_log` + integración en controllers)
- [x] Middleware de roles (`requireRole('admin')`)
- [x] PWA (manifest + service worker)
- [x] ARIA básico en navegación
- [x] Script IA: detección de anomalías (`scripts/detect-anomalies.mjs`)
- [x] **Backup automático a R2 cada 2 horas**
- [x] **Failover automático con PoolManager** (Neon #1 ↔ Neon #2)
- [x] **Restore manual desde R2** vía GitHub Actions

### Próximos pasos

1. **Configurar env vars en Vercel** (necesario para deploy a producción)
2. **Tests E2E con Playwright** (flujo completo: login → registro → liquidación)
3. **Migrar backend restante a TypeScript** (controllers, repositories, routes)
4. **HttpOnly cookies para JWT** (requiere dominio custom en Vercel)
5. **Accesibilidad WCAG 2.1 AA** (auditoría axe, ARIA completo)
6. **PWA offline completo** (caching strategies, background sync)

---

## 11. Riesgos Activos

| # | Riesgo | Impacto | Probabilidad | Mitigación | Estado |
|---|--------|---------|-------------|------------|--------|
| R1 | Credenciales Neon #1 expuestas en git history | Crítico | Alta | Rotar contraseña + configurar env vars en Vercel | ⚠️ Documentado en `SECURITY_REMEDIATION.md` |
| R2 | Sin env vars en Vercel, el deploy falla | Alto | Alta | Configurar antes del próximo deploy | ⚠️ Pendiente |
| R3 | Token de GitHub sin scope `workflow` impide subir workflows | Bajo | Baja | Ya resuelto (token actualizado) | ✅ |
| R4 | Neon.tech downtime > 2 horas | Alto | Baja | Failover automático a Neon #2 | ✅ |
| R5 | Pérdida de datos entre backups (máx. 2h) | Medio | Media | Aceptado para MVP | ⚠️ Monitorear |

---

## 12. Contactos y Accesos

| Rol | Responsable | Contacto |
|-----|------------|----------|
| Desarrollo | Ablutech | ablutech@entel.cl |
| GitHub Owner | rondon-tech | — |
| Neon Admin | ingeniero (ing.rondon2015@gmail.com) | — |
| Cloudflare R2 Admin | — | — |

---

*Documento generado automáticamente al completar el Plan Maestro de Remediación.*
*Próxima actualización programada: al finalizar la configuración de Vercel.*
