# Estado del Proyecto — Horas Extras Entel

> **Última actualización:** 2 de agosto de 2026
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
| Lenguaje BE | JavaScript / TypeScript (parcial) | — |
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
| Frontend | Vercel (https://horas-extras-entel-eight.vercel.app) | ✅ Desplegado |
| Backend API | Vercel (serverless functions) | ✅ Desplegado |
| Base de datos primaria | Neon.tech — `hhee-entel` | ✅ Operativa |
| Base de datos fallback | Neon.tech — `horas-extras-fallback` | ✅ Migrada, standby |
| Backups automáticos | Cloudflare R2 — `backups-app-hhee-entel` | ✅ Cada 2 horas |
| CI pipeline | GitHub Actions | ✅ Lint → typecheck → test → build |
| PoolManager failover | `api/config/db-failover.js` | ✅ Listo |
| Service Worker PWA | `public/sw.js` v3 (network-first) | ✅ Desplegado |
| Registro de horas extras | POST `/api/records` | ✅ Funcional |
| Auditoría avanzada | RecordsList con filtros | ✅ Funcional |

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
│                                   │   11 pantallas (lazy loaded)     │
│                                   │                                  │
│                                   ├── Backend: Express 5              │
│                                   │   (api/index.js)                 │
│                                   │   • 5 routers modulares           │
│                                   │   • PoolManager failover          │
│                                   │   • Zod v4 + safeParse            │
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
├── api/                        # Backend Express
│   ├── index.js                # Entry point
│   ├── config/                 # env, db, db-failover
│   ├── routes/                 # auth, records, expenses, params, admin
│   ├── controllers/            # 5 controladores (auth, record, expense, params, payroll, admin)
│   ├── repositories/           # record, expense, params, user
│   ├── services/               # payroll (cálculo de liquidación), email
│   ├── mappers/                # DTOs + tipos TypeScript
│   ├── middlewares/            # auth, role, validate (safeParse), password-change, errorHandler
│   ├── schemas/                # Zod v4 schemas (safeParse)
│   ├── migrations/             # 7 migraciones versionadas
│   └── utils/                  # money, logger, audit
├── src/                        # Frontend React + TypeScript
│   ├── screens/                # 11 pantallas (lazy loaded)
│   │   ├── AdminPanel.tsx      # Administración de usuarios
│   │   ├── ChangePassword.tsx  # Cambio de contraseña
│   │   ├── DailyRecord.tsx     # Registro diario de actividad
│   │   ├── Dashboard.tsx       # Inicio — Bento Grid
│   │   ├── Expenses.tsx        # Viáticos
│   │   ├── History.tsx         # Configuración de parámetros
│   │   ├── Login.tsx           # Inicio de sesión
│   │   ├── Profile.tsx         # Perfil de usuario
│   │   ├── RecordsList.tsx     # Auditoría avanzada
│   │   ├── Register.tsx        # Registro de usuario
│   │   └── Simulator.tsx       # Simulador de liquidación
│   ├── components/
│   │   ├── AdminGuard.tsx      # Guard de ruta admin
│   │   ├── BentoCard.tsx       # Tarjeta reutilizable Bento Grid
│   │   ├── ConfirmDialog.tsx   # Diálogo de confirmación
│   │   ├── ErrorBoundary.tsx   # Captura de errores por ruta
│   │   ├── HealthBanner.tsx    # Banner de estado de salud
│   │   ├── QuickAddModal.tsx   # Modal de registro rápido TAD/Contingencia
│   │   └── Spinner.tsx         # Indicador de carga
│   ├── hooks/                  # useApi, usePayrollPDF
│   ├── context/                # AuthContext, AppContext
│   ├── api/                    # Axios client con interceptors
│   ├── constants/              # tasks, nemónicos
│   └── utils/                  # formatCLP, PDF generators
├── scripts/                    # backup.mjs, restore.mjs, detect-anomalies.mjs
├── docs/                       # ADRs + OpenAPI spec
├── .github/workflows/          # backup.yml, restore.yml, ci.yml
├── Dockerfile                  # Multi-stage Node 22
├── docker-compose.yml          # Backend + PostgreSQL local
├── public/                     # PWA manifest v3 + service worker v3
├── .env.example                # Template de variables de entorno
├── migrate.mjs                 # Runner de migraciones
└── vercel.json                 # Rewrites para Vercel
```

---

## 4. Base de Datos

### Esquema

| Tabla | Propósito | Columnas destacables |
|-------|-----------|---------------------|
| `records` | Registros diarios de horas extras | `user_id`, `date`, `day_type`, `is_feriado`, `is_contingencia`, `start_time`, `end_time`, `sitio`, `numero_tarea`, `tarea`, `extra_hours` |
| `expenses` | Viáticos (bonos de gestión) | `user_id`, `date`, `nemonico`, `description` |
| `params` | Parámetros de cálculo (por usuario) | `user_id`, `base_salary`, `gratificacion`, `tad_rate`, `contingency_rate`, `viatico_rate`, etc. |
| `users` | Autenticación + perfil | `username`, `password_hash` (bcrypt), `role`, `password_change_required`, `first_name`, `last_name`, `email`, `phone` |
| `audit_log` | Auditoría de cambios | `action`, `entity`, `entity_id`, `changed_by`, `user_id`, `details` |
| `pgmigrations` | Registro de migraciones | — |

### Migraciones aplicadas

| # | Nombre | Descripción |
|---|--------|-------------|
| 001 | `initial-schema` | Tablas core (records, expenses, params) + índices + constraints |
| 002 | `users-table` | Tabla de usuarios con bcrypt hash |
| 003 | `audit-log` | Registro de auditoría |
| 004 | `params-audit` | Columna `updated_at` en params |
| 005 | `multi-tenant` | `user_id` FK en records, expenses, audit_log, params |
| 006 | `password-change` | Columna `password_change_required` en users |
| 007 | `user-profile` | Columnas `first_name`, `last_name`, `email`, `phone` en users |

### Índices

| Índice | Tabla | Columna |
|--------|-------|---------|
| `idx_records_date` | records | date |
| `idx_expenses_date` | expenses | date |
| `idx_records_date_month` | records | EXTRACT(YEAR, MONTH) |
| `idx_records_user_id` | records | user_id |
| `idx_expenses_user_id` | expenses | user_id |
| `idx_audit_entity` | audit_log | entity, entity_id |
| `idx_audit_log_user_id` | audit_log | user_id |
| `idx_params_user_id` | params | user_id |

---

## 5. API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/login` | ❌ | Login (JWT, 12h expiry) |
| `POST` | `/api/register` | ✅ `admin` | Registrar nuevo usuario |
| `POST` | `/api/change-password` | ✅ | Cambiar contraseña (requiere old+new) |
| `GET` | `/api/profile` | ✅ | Obtener perfil del usuario autenticado |
| `PUT` | `/api/profile` | ✅ | Actualizar perfil (firstName, lastName, email, phone) |
| `GET` | `/api/health` | ❌ | Health check DB |
| `GET` | `/api/debug/db-check` | ✅ | Diagnóstico de estructura DB |
| `GET` | `/api/params` | ✅ | Obtener parámetros del usuario |
| `PUT` | `/api/params` | ✅ | Actualizar parámetros |
| `GET` | `/api/records?limit=&offset=` | ✅ | Listar registros (paginado, máx 100) |
| `POST` | `/api/records` | ✅ | Crear registro de horas extras |
| `PUT` | `/api/records/:id` | ✅ | Actualizar registro |
| `DELETE` | `/api/records/:id` | ✅ | Eliminar registro |
| `GET` | `/api/expenses?limit=` | ✅ | Listar viáticos |
| `POST` | `/api/expenses` | ✅ | Crear viático |
| `PUT` | `/api/expenses/:id` | ✅ | Actualizar viático |
| `DELETE` | `/api/expenses/:id` | ✅ | Eliminar viático |
| `GET` | `/api/payroll/:year/:month` | ✅ | Calcular liquidación (cache 5 min) |
| `GET` | `/api/admin/users?page=&limit=` | ✅ `admin` | Listar usuarios (admin) |
| `PUT` | `/api/admin/users/:id` | ✅ `admin` | Editar usuario |
| `DELETE` | `/api/admin/users/:id` | ✅ `admin` | Eliminar usuario |
| `POST` | `/api/admin/users/:id/reset-password` | ✅ `admin` | Resetear contraseña |

---

## 6. Seguridad

### Medidas implementadas

| Medida | Estado |
|--------|--------|
| Helmet (CSP, HSTS, X-Frame, etc.) | ✅ |
| Rate limiting en login (5/15min) y register (3/h) | ✅ |
| Sanitización XSS de inputs vía `xss` en middleware validate | ✅ |
| CORS restrictivo (Vercel + `.vercel.app`) | ✅ |
| Validación de env vars | ✅ |
| SSL enforce en producción | ✅ |
| JWT + roles (`requireAuth`, `requireRole`, `requirePasswordChanged`) | ✅ |
| Bcrypt password hashing | ✅ |
| Audit logging (tabla `audit_log`) | ✅ |
| Body size limit (`1mb`) | ✅ |
| Gzip compression | ✅ |
| Validación Zod v4 con `safeParse` (compatible Express 5) | ✅ |
| Service Worker v3 con network-first para HTML | ✅ |
| Interceptor Axios con manejo de errores mejorado | ✅ |

---

## 7. Infraestructura y URLs

### Producción

| Recurso | URL / Identificador |
|---------|---------------------|
| Repositorio | https://github.com/rondon-tech/HorasExtrasEntel |
| Vercel (producción) | https://horas-extras-entel-eight.vercel.app |
| Neon #1 (primario) | `hhee-entel` |
| Neon #2 (fallback) | `horas-extras-fallback` |
| Cloudflare R2 | `backups-app-hhee-entel` |

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

### 2 de agosto de 2026 — Sesión de desarrollo

**UI/UX — Dashboard Bento Grid:**
- [x] Nuevo componente `BentoCard` reutilizable con soporte de spans
- [x] Dashboard rediseñado con CSS Grid (`grid-template-columns: repeat(4, 1fr)`)
- [x] Jerarquía de tarjetas: Hero col-2 row-2, Horas Extras col-2, mini-tarjetas col-1, Acciones col-4
- [x] Responsive: todas las tarjetas full-width en `<768px`
- [x] Eliminado `react-masonry-css` — reemplazado por CSS Grid nativo
- [x] Dashboard reducido de 17 kB a 9 kB

**UI/UX — Saludo personalizado:**
- [x] Hook `useProfileQuery` con React Query (cache 5 min)
- [x] Saludo "Hola, [Nombre]" en Dashboard usando `GET /profile`
- [x] Fallback: si firstName es "Usuario Temporal", muestra solo "Hola"

**Bug fixes — Registro diario (crítico):**
- [x] **Express 5**: `req.query` es read-only — removida asignación en middleware validate
- [x] **Zod v4**: migrado de `.parse()` (throw) a `.safeParse()` (compatible Zod v4)
- [x] **Race condition**: queries React Query ahora usan `enabled: isAuthenticated`
- [x] **Service Worker**: cambiado de cache-first a network-first para HTML (v2 → v3)
- [x] **Error handling**: `mutateAsync` en mutaciones + try/catch + toast de error con detalle
- [x] **Interceptor**: errores del servidor expuestos como `error.serverData` en frontend
- [x] **ErrorHandler**: ahora expone `message`, `code`, `detail` en producción

**Bug fixes — Auditoría avanzada:**
- [x] Rango de fechas ampliado a año completo (antes solo mes actual)
- [x] Límite de registros aumentado a 100 (antes 50)

**Bug fixes — AdminPanel:**
- [x] Columnas grid con `minmax(0, fr)` para evitar overflow en pantallas angostas
- [x] Breakpoint responsive subido a 900px para layout de tarjeta
- [x] Layout expandido: `.app-container` max-width 1200px (antes 600px)

### 1 de agosto de 2026 — Plan Maestro de Remediación completado

**Fase 1 — Seguridad:**
- [x] Credenciales de BD aisladas
- [x] Helmet + CSP + rate limiting + sanitización XSS + CORS restrictivo
- [x] Todos los secretos hardcodeados eliminados
- [x] SSL verification condicionado a producción

**Fase 2 — Backend:**
- [x] Arquitectura modular 5 capas
- [x] `api/index.js` reducido a 112 líneas
- [x] 7 migraciones DB versionadas (001-007)
- [x] Índices + constraints de integridad
- [x] TypeScript parcial (env, money, mappers)
- [x] Health check endpoint
- [x] Tests backend: 33 pruebas

**Fase 3 — Frontend:**
- [x] React Router 7 con 11 rutas declarativas + deep linking
- [x] AppContext refactorizado a React Query
- [x] 0 `alert()` — react-hot-toast
- [x] ErrorBoundary en cada ruta
- [x] PDF hook compartido (`usePayrollPDF`)
- [x] Lazy loading: bundle optimizado

**Fase 4 — DevOps:**
- [x] Dockerfile + docker-compose.yml
- [x] GitHub Actions CI
- [x] Compresión gzip
- [x] API pagination
- [x] 4 ADRs documentados
- [x] OpenAPI spec

**Fase 5 — Seguridad avanzada + Backup:**
- [x] bcrypt hash de contraseñas
- [x] Audit logging
- [x] Middleware de roles
- [x] PWA (manifest v3 + service worker v3)
- [x] ARIA básico en navegación
- [x] Detección de anomalías
- [x] Backup automático a R2 cada 2 horas
- [x] Failover automático con PoolManager
- [x] Restore manual desde R2 vía GitHub Actions

### Próximos pasos

1. **Tests E2E con Playwright** (flujo completo: login → registro → liquidación)
2. **Migrar backend restante a TypeScript** (controllers, repositories, routes)
3. **HttpOnly cookies para JWT** (requiere dominio custom en Vercel)
4. **Accesibilidad WCAG 2.1 AA** (auditoría axe, ARIA completo)
5. **PWA offline completo** (caching strategies, background sync)

---

## 11. Riesgos Activos

| # | Riesgo | Impacto | Probabilidad | Mitigación | Estado |
|---|--------|---------|-------------|------------|--------|
| R1 | Credenciales Neon expuestas en git history | Crítico | Alta | Rotar contraseña + env vars en Vercel | ⚠️ Documentado |
| R2 | Sin env vars en Vercel, el deploy falla | Alto | Baja | Ya configurado — deploy activo | ✅ |
| R3 | Neon.tech downtime > 2 horas | Alto | Baja | Failover automático a Neon #2 | ✅ |
| R4 | Pérdida de datos entre backups (máx. 2h) | Medio | Media | Aceptado para MVP | ⚠️ Monitorear |
| R5 | Service Worker cachea versión antigua | Medio | Media | Network-first HTML en SW v3 | ✅ |
| R6 | Incompatibilidad Express 5 / Zod v4 | Alto | Alta | safeParse + sin asignación a req.query | ✅ |

---

## 12. Contactos y Accesos

| Rol | Responsable | Contacto |
|-----|------------|----------|
| Desarrollo | Ablutech | ablutech@entel.cl |
| GitHub Owner | rondon-tech | — |
| Neon Admin | ingeniero (ing.rondon2015@gmail.com) | — |

---

*Documento actualizado al 2 de agosto de 2026 — sesión de desarrollo UI/UX + bug fixes.*
