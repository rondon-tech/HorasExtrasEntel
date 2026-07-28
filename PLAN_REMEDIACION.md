# PLAN MAESTRO DE REMEDIACIÓN

## Proyecto: Horas Extras Entel
## Fecha: 28 de Julio de 2026
## Equipo: CTO, Principal Architect, Principal Engineer, EM, TPM, Staff Backend, Staff Frontend, DevOps Architect, Cloud Architect, Security Engineer, Database Architect, QA Lead, UX/UI Lead, Product Manager
## Documento base: AUDITORIA_TECNICA.md

---

# 1. RESUMEN EJECUTIVO

La auditoría técnica concluyó que **Horas Extras Entel** es un MVP funcional (calificación 5.2/10) que **no está listo para producción empresarial** debido a vulnerabilidades de seguridad críticas y una arquitectura backend monolítica que impide la escalabilidad y el mantenimiento.

Este Plan Maestro de Remediación convierte los 344 hallazgos de la auditoría en **44 tareas concretas**, organizadas en **6 fases**, **13 sprints** y un cronograma de **26 semanas (~6 meses)** con un esfuerzo total estimado de **~192 horas-persona**.

## Decisiones estratégicas clave

1. **No se reescribe desde cero.** Se evoluciona incrementalmente. El frontend tiene una base sólida que se refactoriza, no se descarta.
2. **La seguridad es bloqueante.** Ningún nuevo feature se desarrolla hasta completar la Fase 1 (estabilización de seguridad, 8h).
3. **El backend se migra a TypeScript** de forma progresiva, archivo por archivo, sin big-bang rewrite.
4. **Se prioriza reducir riesgo antes de añadir valor.** Estabilizar > Refactorizar > Optimizar > Escalar.

## Supuestos y conflictos identificados

| # | Supuesto / Conflicto | Resolución |
|---|---------------------|------------|
| S1 | Se asume un equipo de **2 desarrolladores full-stack** + 1 DevOps part-time | Los esfuerzos están en horas-persona; escalar linealmente con más devs |
| S2 | Conflict: "Migrar backend a TS" vs "Modularizar backend" | Se modulariza primero en JS, luego se migra a TS archivo por archivo (reduce riesgo) |
| S3 | Conflict: "HttpOnly cookies" vs "Arquitectura serverless Vercel" | En serverless sin dominio propio es complejo; se pospone a Fase 6 y se mitiga con CSP + token corto meanwhile |
| S4 | Conflict: "React Router" vs "Navegación actual por tabs" | Migración gradual: se introduce router sin romper el switch actual mediante coexistencia |
| S5 | La auditoría no detalla el volumen actual de datos | Se asume <1,000 registros; si fuera mayor, repriorizar paginación a Fase 2 |
| S6 | No se confirmó si `.env` ya fue commiteado al git history | **Acción preventiva:** ejecutar `git log --all -- .env` antes de Fase 1 |

---

# 2. SÍNTESIS DE HALLAZGOS

## 2.1 Problemas repetidos (patrones transversales)

| Patrón repetido | Ocurrencias | Causa raíz |
|----------------|-------------|------------|
| Secretos hardcodeados con fallback | 4 (JWT secret, admin user, admin pass, DB ssl) | Falta de disciplina de configuración + ausencia de validación de env vars |
| Duplicación de código | 5 (tareasOptions ×2, formatCurrency ×4, PDF handlers ×3, extraHourRate ×2, DTO mapping manual) | Ausencia de capa de utilidades compartidas |
| Uso de `any` sin tipado | 8+ (payrollSummary, PDF generators, catch blocks, event handlers) | Backend sin TypeScript + tipado perezoso en frontend |
| `alert()` para feedback UI | 8 ocurrencias en 4 pantallas | Ausencia de sistema de notificaciones |
| Inline styles en JSX | 30+ ocurrencias | Design system CSS incompleto |
| Sin estados de carga | Toda la app | Ausencia de patrones de loading (skeletons) |
| Queries SQL sin índices | 2 tablas principales | Esquema DB diseñado para MVP sin consideración de rendimiento |

## 2.2 Dependencias entre hallazgos

```
Sin validación de env vars ──┐
Secretos hardcodeados ───────┼─→ Bloquea todo despliegue seguro
SSL sin verificación ────────┘

Backend monolítico ─→ Bloquea ─→ Migración a TS
                  ─→ Bloquea ─→ Testing de integración
                  ─→ Bloquea ─→ Modularización de features

Sin React Router ─→ Bloquea ─→ Deep linking
                ─→ Bloquea ─→ Mejoras de UX (back/forward)

AppContext gigante ─→ Bloquea ─→ Testing de componentes
                  ─→ Dificulta ─→ React Query migration

Sin migraciones DB ─→ Riesgo ─→ Cualquier cambio de esquema
Sin índices DB ─────→ Riesgo ─→ Degradación con volumen
```

## 2.3 Componentes más afectados

| Componente | Hallazgos | Severidad máxima |
|-----------|-----------|-----------------|
| `api/index.js` | 12 | CRÍTICA |
| `src/context/AppContext.tsx` | 8 | Alta |
| `api/services/payroll.service.js` | 4 | Media |
| `src/screens/Dashboard.tsx` | 5 | Media |
| `src/screens/RecordsList.tsx` | 4 | Media |
| `.env` | 1 | CRÍTICA |
| `api/middlewares/auth.js` | 2 | CRÍTICA |

## 2.4 Quick Wins (alto impacto, bajo esfuerzo)

| # | Quick Win | Impacto | Esfuerzo |
|---|-----------|---------|----------|
| QW1 | Rotar credenciales Neon.tech + configurar env vars en Vercel | Crítico | 1h |
| QW2 | Eliminar fallbacks hardcodeados (JWT, admin, ssl) | Crítico | 1h |
| QW3 | Instalar y configurar helmet + express-rate-limit | Alto | 2h |
| QW4 | Extraer `tareasOptions` a archivo compartido | Medio | 0.5h |
| QW5 | Extraer `formatCurrency` a utils compartido | Medio | 0.5h |
| QW6 | Generar select de años dinámicamente | Bajo | 0.5h |
| QW7 | Agregar `express.json({ limit: '1mb' })` | Medio | 0.1h |

---

# 3. PRIORIZACIÓN DE PROBLEMAS

## 3.1 Clasificación por categoría

### Seguridad (7 hallazgos — 4 críticos)

| ID | Problema | Origen | Impacto | Severidad | Urgencia | Depende de |
|----|----------|--------|---------|-----------|----------|------------|
| SEC-01 | Credenciales BD expuestas en `.env` | `api/index.js:62` | Compromiso total BD | CRÍTICA | Inmediata | — |
| SEC-02 | JWT secret hardcodeado `'dev-secret-key-12345'` | `api/index.js:52`, `auth.js:13` | Forgery de tokens | CRÍTICA | Inmediata | — |
| SEC-03 | Credenciales admin por defecto `admin/password123` | `api/index.js:48-49` | Acceso no autorizado | CRÍTICA | Inmediata | — |
| SEC-04 | SSL `rejectUnauthorized: false` | `api/index.js:64` | MITM sobre BD | CRÍTICA | Inmediata | — |
| SEC-05 | Token JWT en localStorage | `client.ts:11`, `AuthContext.tsx:13` | Robo por XSS | ALTA | Fase 6 | CSP (SEC-08) |
| SEC-06 | Sin rate limiting en login | `api/index.js:45-56` | Fuerza bruta | ALTA | Inmediata | — |
| SEC-07 | Sin sanitización de inputs de texto | Múltiples endpoints | XSS almacenado | ALTA | Fase 1 | — |
| SEC-08 | Sin headers de seguridad HTTP | `api/index.js` | Múltiples vectores | MEDIA | Inmediata | — |
| SEC-09 | CORS demasiado permisivo (`.vercel.app`) | `api/index.js:27` | Acceso desde previews ajenos | MEDIA | Fase 1 | — |

### Arquitectura (5 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| ARC-01 | Backend monolítico 358 líneas | Mantenibilidad imposible | ALTA | Fase 2 | — |
| ARC-02 | Backend en JS vs frontend en TS | Inconsistencia, sin type safety | ALTA | Fase 2 | ARC-01 |
| ARC-03 | Sin router declarativo frontend | UX deficiente | MEDIA | Fase 3 | — |
| ARC-04 | AppContext gigante (262 líneas) | Acoplamiento | MEDIA | Fase 3 | — |
| ARC-05 | Sin capas en backend (sin repositorios/servicios) | Testing imposible | ALTA | Fase 2 | ARC-01 |

### Base de Datos (5 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| DB-01 | Migraciones inline sin versionado | Inconsistencia, pérdida datos | ALTA | Fase 2 | — |
| DB-02 | Sin índices en columnas de fecha | Degradación de queries | MEDIA | Fase 2 | — |
| DB-03 | Tabla `params` single-row sin auditoría | Sin historial de cambios | MEDIA | Fase 4 | — |
| DB-04 | Sin constraints de integridad | Datos inconsistentes | MEDIA | Fase 2 | — |
| DB-05 | `EXTRACT(YEAR FROM date)` no usa índices | Queries lentas | MEDIA | Fase 2 | DB-02 |

### Frontend (7 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| FE-01 | Duplicación de `tareasOptions` | Mantenibilidad | BAJA | Fase 1 | — |
| FE-02 | Duplicación de `formatCurrency` | Mantenibilidad | BAJA | Fase 1 | — |
| FE-03 | Duplicación de PDF handlers | Mantenibilidad | BAJA | Fase 3 | — |
| FE-04 | Uso de `alert()` para feedback | UX deficiente | MEDIA | Fase 3 | — |
| FE-05 | Sin estados de carga | UX deficiente | MEDIA | Fase 3 | ARC-04 |
| FE-06 | Sin Error Boundaries | Crash total | MEDIA | Fase 3 | — |
| FE-07 | Sin accesibilidad (ARIA) | Exclusión de usuarios | BAJA | Fase 5 | — |

### DevOps (5 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| DEV-01 | Sin CI/CD | Deploys manuales | ALTA | Fase 4 | — |
| DEV-02 | Sin Docker | Inconsistencia entornos | MEDIA | Fase 4 | — |
| DEV-03 | Sin validación de env vars | Fallbacks inseguros | ALTA | Fase 1 | — |
| DEV-04 | Sin health check | Sin observabilidad | MEDIA | Fase 4 | — |
| DEV-05 | Sin monitoreo de errores | Errores invisibles | MEDIA | Fase 4 | — |

### Testing (3 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| TST-01 | Cobertura ~5% (solo 7 tests) | Regresiones sin detectar | ALTA | Fase 2 | ARC-01 |
| TST-02 | Sin tests frontend | Regresiones UI | MEDIA | Fase 3 | — |
| TST-03 | Sin tests E2E | Sin validación de flujos | MEDIA | Fase 4 | ARC-03 |

### Rendimiento (5 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| PERF-01 | Sin paginación en `/api/records` | Payload crece linealmente | MEDIA | Fase 3 | — |
| PERF-02 | Sin caché de payroll | Recálculo constante | MEDIA | Fase 3 | — |
| PERF-03 | 4 llamadas API secuenciales al iniciar | Latencia inicial | MEDIA | Fase 3 | ARC-04 |
| PERF-04 | División float en extraHourRate | Precisión financiera | BAJA | Fase 1 | — |
| PERF-05 | Años hardcodeados `[2024-2027]` | Falla en 2028 | BAJA | Fase 1 | — |

### Documentación (2 hallazgos)

| ID | Problema | Impacto | Severidad | Urgencia | Depende de |
|----|----------|---------|-----------|----------|------------|
| DOC-01 | README es template Vite sin modificar | Onboarding imposible | ALTA | Fase 1 | — |
| DOC-02 | Sin docs de API, arquitectura, deploy | Mantenimiento difícil | ALTA | Fase 4 | ARC-01 |

---

# 4. MATRIZ IMPACTO × ESFUERZO

```
  ALTO IMPACTO
       │
       │  ┌──────────────┬──────────────┐
       │  │  QUICK WINS   │  GRANDES     │
       │  │  (Hacer YA)   │  PROYECTOS   │
       │  │              │  (Planificar) │
       │  ├──────────────┼──────────────┤
       │  │  RELLENAR    │  EVITAR      │
       │  │  (Cuando se   │  (No hacer)  │
       │  │  pueda)       │              │
       │  └──────────────┴──────────────┘
       └──────────────────────────────────────
         BAJO ESFUERZO        ALTO ESFUERZO
```

| Tarea | Impacto | Esfuerzo | Cuadrante | Prioridad |
|-------|---------|----------|-----------|-----------|
| SEC-01 Rotar credenciales BD | Crítico | 1h | Quick Win | P0 |
| SEC-02 Eliminar JWT secret hardcodeado | Crítico | 1h | Quick Win | P0 |
| SEC-03 Eliminar admin/password123 | Crítico | 1h | Quick Win | P0 |
| SEC-04 Fix SSL verification | Crítico | 0.5h | Quick Win | P0 |
| SEC-06 Rate limiting login | Alto | 2h | Quick Win | P0 |
| SEC-08 Helmet.js headers | Alto | 2h | Quick Win | P0 |
| DEV-03 Validación env vars | Alto | 1h | Quick Win | P0 |
| PERF-04 Fix división float | Bajo | 0.5h | Quick Win | P1 |
| PERF-05 Años dinámicos | Bajo | 0.5h | Quick Win | P1 |
| FE-01 Extraer tareasOptions | Medio | 0.5h | Quick Win | P1 |
| FE-02 Extraer formatCurrency | Medio | 0.5h | Quick Win | P1 |
| DOC-01 Reescribir README | Alto | 2h | Quick Win | P1 |
| SEC-09 CORS restrictivo | Medio | 1h | Quick Win | P1 |
| SEC-07 Sanitización inputs | Alto | 3h | Quick Win | P1 |
| ARC-01 Modularizar backend | Alto | 16h | Gran Proyecto | P2 |
| ARC-02 Migrar backend a TS | Alto | 24h | Gran Proyecto | P2 |
| DB-01 Sistema de migraciones | Alto | 8h | Gran Proyecto | P2 |
| DB-02 + DB-05 Índices + queries | Medio | 4h | Gran Proyecto | P2 |
| TST-01 Tests backend | Alto | 16h | Gran Proyecto | P2 |
| ARC-03 React Router | Medio | 8h | Gran Proyecto | P3 |
| ARC-04 + FE-05 Separar AppContext + loaders | Medio | 16h | Gran Proyecto | P3 |
| PERF-01 + PERF-02 Paginación + caché | Medio | 8h | Gran Proyecto | P3 |
| DEV-01 CI/CD GitHub Actions | Alto | 8h | Gran Proyecto | P3 |
| FE-04 Sistema de toasts | Medio | 4h | Rellenar | P3 |
| FE-06 Error Boundaries | Medio | 2h | Rellenar | P3 |
| SEC-05 HttpOnly cookies | Alto | 8h | Gran Proyecto | P4 |
| DEV-02 Docker | Medio | 6h | Rellenar | P4 |
| FE-07 Accesibilidad | Bajo | 16h | Rellenar | P5 |
| DB-03 Auditoría params | Bajo | 4h | Rellenar | P4 |
| DOC-02 Docs API + arquitectura | Alto | 8h | Gran Proyecto | P3 |

---

# 5. ROADMAP POR FASES

## Fase 0 — Comprensión y Preparación (Semana 1, 2h)

**Objetivo:** Verificar el alcance del daño y preparar el entorno antes de tocar código.

**Entregables:**
- Verificación de si `.env` fue commiteado al git history
- Backup completo de la base de datos Neon.tech
- Creación de rama `release/remediation` y board de tareas
- Configuración de variables de entorno en Vercel (valores vacíos, pendientes de llenar)

**Riesgos:**
- Las credenciales ya pueden estar comprometidas si fueron commiteadas
- doit: Mitigar rotando credenciales independientemente del resultado

**Validaciones:**
- `git log --all -- .env` no debe mostrar commits
- Backup de BD descargado y verificado

---

## Fase 1 — Estabilización de Seguridad (Semana 1, 8h)

**Objetivo:** Eliminar todas las vulnerabilidades críticas y de alto riesgo sin cambiar la arquitectura.

**Entregables:**
1. Credenciales de BD rotadas y configuradas en Vercel env vars
2. `JWT_SECRET` generado (256 bits) y configurado en Vercel
3. `ADMIN_USER` y `ADMIN_PASSWORD` configurados en Vercel
4. Fallbacks hardcodeados eliminados del código (crash si falta env var)
5. `helmet` instalado y configurado
6. `express-rate-limit` instalado en `/api/login` (5 intentos/15min)
7. `rejectUnauthorized: false` condicionado a `NODE_ENV !== 'production'`
8. `express.json({ limit: '1mb' })` configurado
9. CORS restringido a dominios específicos (eliminar wildcard `.vercel.app`)
10. Validación de env vars al iniciar el servidor
11. Sanitización de inputs de texto con librería `xss`
12. Quick wins de código (tareasOptions, formatCurrency, años dinámicos, fix float)
13. README reescrito con documentación mínima

**Riesgos:**
- La eliminación de fallbacks puede romper el dev local → Proveer `.env.example` con placeholders
- Rate limiting puede bloquear a usuarios legítimos en NAT → Configurar trust proxy

**Validaciones:**
- Login con credenciales por defecto falla en producción (sin env vars)
- Ataque de fuerza bruta (100 intentos) es bloqueado tras 5
- Headers de seguridad presentes en respuesta HTTP (verificar con securityheaders.com)
- Dev local funciona con `.env.example` copiado a `.env`

**Dependencias:** Ninguna (ejecutar primero)

---

## Fase 2 — Refactorización Arquitectónica del Backend (Semanas 2-5, 48h)

**Objetivo:** Transformar el monolito `api/index.js` en una arquitectura modular en TypeScript con capas claras.

**Entregables:**
1. Estructura de carpetas modular creada (`routes/`, `controllers/`, `services/`, `repositories/`)
2. `api/index.js` reducido a solo configuración de Express (≤50 líneas)
3. Routers separados por módulo: `auth.routes`, `records.routes`, `expenses.routes`, `params.routes`, `payroll.routes`
4. Controladores extraídos (manejan HTTP, delegan a servicios)
5. Servicios extraídos (lógica de negocio, sin acceso a `req`/`res`)
6. Repositorios extraídos (acceso a PostgreSQL, mappers snake↔camel)
7. TypeScript configurado para backend con `tsconfig.backend.json`
8. Migración a TS archivo por archivo (sin big-bang)
9. Sistema de migraciones con `node-pg-migrate` o `Knex`
10. Índices compuestos en `records(date)` y `expenses(date)`
11. Queries migradas de `EXTRACT(YEAR FROM date)` a range queries (`date >= $1 AND date < $2`)
12. Constraints de integridad (CHECK en `day_type`, `extra_hours >= 0`)
13. Health check endpoint `/api/health`
14. Tests unitarios backend (servicios y repositorios) — 60% cobertura
15. Tests de integración API (supertest) — flujos críticos

**Riesgos:**
- Rotura de la API durante refactoring → Mantener tests de regresión ejecutándose
- Migración a TS puede introducir errores de tipo → Usar `strict: false` inicialmente, incrementar gradualmente
- Cambio de queries puede alterar resultados → Comparar outputs antes/después

**Validaciones:**
- `npm test` pasa con 60%+ cobertura backend
- Todos los endpoints responden igual que antes (regresión)
- Migraciones aplican limpiamente en BD nueva
- `tsc --noEmit` pasa sin errores

**Dependencias:** Fase 1 completada (seguridad estabilizada)

---

## Fase 3 — Modernización del Frontend (Semanas 6-9, 32h)

**Objetivo:** Mejorar la arquitectura frontend, UX y rendimiento de la SPA.

**Entregables:**
1. React Router instalado y configurado con rutas declarativas
2. Migración de navegación por tabs a rutas (coexistencia temporal)
3. Deep linking funcional (`/simulator/2026/7`)
4. `AppContext` refactorizado en hooks de React Query (`useRecords`, `useExpenses`, `useParams`, `usePayroll`)
5. Estados de carga (skeletons/spinners) en todas las pantallas
6. Sistema de toast notifications (react-hot-toast) reemplazando `alert()`
7. Error Boundaries envolviendo cada ruta
8. Duplicación de PDF handlers eliminada (hook `usePayrollPDF`)
9. Paginación en `/api/records` (cursor-based) y en `RecordsList`
10. Caché de payroll con React Query (staleTime: 5min)
11. Inline styles migrados a clases CSS del design system
12. Tests de componentes frontend (Vitest + Testing Library) — 40% cobertura

**Riesgos:**
- Migración a React Router puede romper el estado de navegación actual → Migrar gradualmente con redirect
- React Query cambia el modelo de data fetching → Verificar que no haya race conditions

**Validaciones:**
- URLs compartibles funcionan (pegar `/simulator` carga la vista correcta)
- Toast reemplaza todos los `alert()` (verificar con grep)
- Skeleton se muestra durante carga de datos
- Error Boundary captura un error forzado sin crashar la app
- Tests frontend pasan

**Dependencias:** Fase 2 (API estable) y Fase 1 (seguridad)

---

## Fase 4 — Automatización, DevOps y Observabilidad (Semanas 10-13, 24h)

**Objetivo:** Establecer CI/CD, containerización, monitoreo y documentación.

**Entregables:**
1. `Dockerfile` multi-stage para el backend
2. `docker-compose.yml` con backend + frontend + PostgreSQL local
3. GitHub Actions workflow: lint → test → build → deploy (a Vercel preview)
4. Validación de env vars en CI (no permite deploy si faltan vars críticas)
5. Sentry integrado en frontend y backend para tracking de errores
6. Endpoint `/api/health` con verificación de conexión a BD
7. Logs estructurados (JSON) con correlación por request ID
8. Documentación de API generada (OpenAPI/Swagger o tsoa)
9. Documentación de arquitectura (diagramas + ADRs)
10. Guía de contribución (CONTRIBUTING.md, estándares de código)
11. Tests E2E básicos (Playwright) — flujo login → crear registro → ver liquidación

**Riesgos:**
- Docker en Vercel serverless no aplica → Dockerfile solo para dev/local, Vercel usa Functions
- Sentry puede generar ruido → Configurar `beforeSend` para filtrar ruido

**Validaciones:**
- `git push` dispara CI y bloquea merge si tests fallan
- Docker compose levanta el stack completo localmente
- Sentry captura un error de prueba
- E2E test pasa en CI

**Dependencias:** Fase 2 y Fase 3 (código estable para testear)

---

## Fase 5 — Rendimiento y Optimización (Semanas 14-17, 16h)

**Objetivo:** Optimizar el rendimiento para volúmenes crecientes de datos.

**Entregables:**
1. Índices optimizados basados en queries reales (EXPLAIN ANALYZE)
2. Caché de resultados de payroll (Redis o cache en memoria)
3. Compresión de respuestas HTTP (gzip/brotli)
4. Lazy loading de rutas con React.lazy
5. Optimización de bundle (code splitting, tree shaking)
6. Métricas de rendimiento Web Vitals monitorizadas
7. Paginación optimizada (cursor-based en lugar de OFFSET)
8. Tabla `params` con auditoría (`updated_at`, `updated_by`)
9. Tests de rendimiento (k6) con 100, 1000 y 10000 registros

**Riesgos:**
- Redis añade complejidad operacional → Evaluar si cache en memoria (node-cache) es suficiente para el volumen

**Validaciones:**
- Tiempo de respuesta `/api/records` <200ms con 1000 registros
- LCP <2.5s, CLS <0.1
- Cache hit ratio >80% en payroll

**Dependencias:** Fase 2 (índices), Fase 3 (paginación)

---

## Fase 6 — Seguridad Avanzada y Escalabilidad (Semanas 18-26, 24h)

**Objetivo:** Alcanar nivel de seguridad empresarial y preparar para escalado.

**Entregables:**
1. Migración de token JWT a HttpOnly cookies (con CSRF tokens)
2. Hash de contraseñas con bcrypt (tabla `users` en BD)
3. Sistema de roles y permisos (admin, supervisor, técnico)
4. Rate limiting global + por endpoint
5. Audit logging (quién hizo qué y cuándo)
6. Backups automatizados con política de retención
7. PWA con offline support (Service Worker, manifest)
8. Accesibilidad WCAG 2.1 AA (ARIA, navegación por teclado, focus management)
9. SEO básico (meta tags, Open Graph)
10. IA: Prototipo de detección de anomalías en horas extras

**Riesgos:**
- HttpOnly cookies en serverless sin dominio propio son complejas → Requiere dominio personalizado configurado en Vercel
- Múltiples usuarios requiere rediseño de schema (multi-tenant) → Evaluar si el producto lo necesita

**Validaciones:**
- Token no accesible vía JavaScript (`document.cookie` no lo expone si es HttpOnly)
- Passsword nunca se almacena en texto plano
- Axe audit pasa con 0 violaciones críticas
- PWA instalable y funcional offline

**Dependencias:** Todas las fases anteriores

---

# 6. BACKLOG TÉCNICO DETALLADO

## Prioridad P0 — Crítico (ejecutar antes de cualquier otro trabajo)

| ID | Título | Descripción | Impacto | Esfuerzo | Complejidad | Responsable | Depende de | Criterio de aceptación |
|----|--------|-------------|---------|----------|-------------|-------------|------------|----------------------|
| T001 | Rotar credenciales BD Neon.tech | Generar nueva contraseña en panel Neon, actualizar `DATABASE_URL` en Vercel env vars | Crítico | 1h | Baja | DevOps | — | App conecta a BD con nueva contraseña; `.env` local eliminado |
| T002 | Eliminar JWT secret hardcodeado | Quitar fallback `'dev-secret-key-12345'`, lanzar error si falta `JWT_SECRET` | Crítico | 1h | Baja | Backend | T001 | Server crashea si falta `JWT_SECRET`; login funciona con env var |
| T003 | Eliminar credenciales admin por defecto | Quitar fallback `admin`/`password123`, lanzar error si faltan env vars | Crítico | 1h | Baja | Backend | T001 | Login falla con credenciales por defecto; funciona con env vars |
| T004 | Fix SSL verification | Condicionar `rejectUnauthorized: false` a `NODE_ENV !== 'production'` | Crítico | 0.5h | Baja | Backend | — | En producción, SSL verifica certificados |
| T005 | Instalar Helmet.js | `npm i helmet`, `app.use(helmet())` con CSP configurada | Alto | 2h | Baja | Backend | — | securityheaders.com nota A+ |
| T006 | Rate limiting en login | `express-rate-limit`: 5 intentos por IP cada 15 min en `/api/login` | Alto | 2h | Baja | Backend | — | 6º intento retorna 429 |
| T007 | Validación de env vars al startup | Función `validateEnv()` que crashea si faltan vars críticas | Alto | 1h | Baja | Backend | T002, T003 | Server no inicia si falta cualquier var crítica |

**Total P0: 8.5h**

## Prioridad P1 — Alta (Fase 1 continuada)

| ID | Título | Descripción | Impacto | Esfuerzo | Complejidad | Responsable | Depende de | Criterio de aceptación |
|----|--------|-------------|---------|----------|-------------|-------------|------------|----------------------|
| T008 | CORS restrictivo | Eliminar wildcard `.vercel.app`, usar `FRONTEND_URL` específico | Medio | 1h | Baja | Backend | T007 | Solo dominios configurados pueden acceder |
| T009 | Sanitización inputs texto | Instalar `xss`, sanitizar `sitio`, `tarea`, `description` en schemas Zod | Alto | 3h | Media | Backend | — | Input con `<script>` se almacena sanitizado |
| T010 | Limite body size | `express.json({ limit: '1mb' })` | Medio | 0.1h | Baja | Backend | — | Request >1MB retorna 413 |
| T011 | Extraer `tareasOptions` | Crear `src/constants/tasks.ts`, importar en DailyRecord y Expenses | Medio | 0.5h | Baja | Frontend | — | Una sola fuente de verdad para tareas |
| T012 | Extraer `formatCurrency` | Crear `src/utils/format.ts`, reemplazar 4 copias | Medio | 0.5h | Baja | Frontend | — | Una sola implementación |
| T013 | Años dinámicos en select | Generar array de años desde `currentYear - 1` hasta `currentYear + 2` | Bajo | 0.5h | Baja | Frontend | — | Select muestra años correctos en 2028+ |
| T014 | Fix división float extraHourRate | Usar `Math.round()` en payroll.service.js:14 | Bajo | 0.5h | Baja | Backend | — | Cálculo usa aritmética de enteros |
| T015 | Reescribir README | Documentar objetivo, setup, env vars, scripts, deploy | Alto | 2h | Baja | Tech Writer | — | Nuevo dev puede levantar la app con solo el README |
| T016 | Crear `.env.example` | Template con placeholders para todas las env vars necesarias | Medio | 0.5h | Baja | DevOps | T007 | Dev clona repo, copia `.env.example`, levanta local |

**Total P1: 8.6h**

## Prioridad P2 — Arquitectura Backend (Fase 2)

| ID | Título | Descripción | Impacto | Esfuerzo | Complejidad | Responsable | Depende de | Criterio de aceptación |
|----|--------|-------------|---------|----------|-------------|-------------|------------|----------------------|
| T017 | Configurar TS en backend | `tsconfig.backend.json`, `tsx` para runtime, scripts en package.json | Alto | 4h | Media | Backend | T007 | `tsc --noEmit` pasa; `npm run server` levanta TS |
| T018 | Separar routes de index.js | Extraer routers a `routes/*.router.ts` | Alto | 4h | Media | Backend | T017 | `index.js` ≤50 líneas; rutas en archivos separados |
| T019 | Extraer controllers | `controllers/*.controller.ts` manejan HTTP, delegan a services | Alto | 4h | Media | Backend | T018 | Controllers no contienen lógica de negocio ni SQL |
| T020 | Extraer services | `services/*.service.ts` contienen lógica de negocio | Alto | 4h | Media | Backend | T019 | Services no acceden a `req`/`res` ni a `pg` directamente |
| T021 | Extraer repositories | `repositories/*.repository.ts` acceden a PostgreSQL | Alto | 4h | Media | Backend | T020 | Repositories son la única capa que toca `pg` |
| T022 | DTOs y mappers | Funciones `toRecordDTO`, `toExpenseDTO`, `toParamsDTO` | Medio | 2h | Baja | Backend | T021 | Mapeo snake↔camel en un solo lugar |
| T023 | Sistema de migraciones | Instalar `node-pg-migrate`, crear migración inicial del esquema actual | Alto | 8h | Alta | DBA | T017 | `npm run migrate up` crea esquema limpio en BD nueva |
| T024 | Índices + range queries | Índice en `records(date)`, migrar `EXTRACT` a `date >= $1 AND date < $2` | Medio | 4h | Media | DBA | T021 | EXPLAIN ANALYZE usa index scan |
| T025 | Constraints de integridad | CHECK en `day_type`, `extra_hours >= 0`, `date NOT NULL` | Medio | 2h | Baja | DBA | T023 | Constraints aplicados via migración |
| T026 | Health check endpoint | `GET /api/health` verifica conexión a BD | Medio | 1h | Baja | Backend | T021 | Retorna 200 si BD conecta, 503 si no |
| T027 | Tests unitarios backend | Tests para services y repositories con 60% cobertura | Alto | 12h | Alta | QA | T020, T021 | `npm test` pasa; cobertura ≥60% |
| T028 | Tests integración API | supertest: login, CRUD records/expenses, payroll | Alto | 8h | Alta | QA | T018 | Flujos críticos E2E de API pasan |

**Total P2: 57h**

## Prioridad P3 — Frontend y DevOps (Fase 3 y 4)

| ID | Título | Descripción | Impacto | Esfuerzo | Complejidad | Responsable | Depende de | Criterio de aceptación |
|----|--------|-------------|---------|----------|-------------|-------------|------------|----------------------|
| T029 | React Router | Instalar, configurar rutas, migrar switch a rutas | Medio | 8h | Media | Frontend | T018 | URLs profundas funcionan |
| T030 | Refactor AppContext → React Query | Hooks `useRecords`, `useExpenses`, `useParams`, `usePayroll` | Medio | 12h | Alta | Frontend | T028 | AppContext reducido a <50 líneas o eliminado |
| T031 | Estados de carga | Skeletons/spinners en Dashboard, RecordsList, Simulator | Medio | 4h | Baja | Frontend | T030 | Usuario ve skeleton durante carga |
| T032 | Sistema de toasts | react-hot-toast, reemplazar 8 `alert()` | Medio | 4h | Baja | Frontend | — | `grep -r "alert(" src/` no encuentra en pantallas |
| T033 | Error Boundaries | ErrorBoundary envolviendo cada ruta | Medio | 2h | Baja | Frontend | T029 | Error forzado no crasha app completa |
| T034 | Hook `usePayrollPDF` | Extraer lógica PDF duplicada de Dashboard y Simulator | Bajo | 2h | Baja | Frontend | — | Un solo lugar genera PDFs |
| T035 | Paginación API + UI | Cursor-based pagination en `/api/records`, UI en RecordsList | Medio | 6h | Media | Backend + Frontend | T021 | Lista carga 20 items por página |
| T036 | Caché payroll | React Query staleTime 5min en payroll | Medio | 2h | Baja | Frontend | T030 | Segunda consulta usa cache |
| T037 | Docs API (OpenAPI) | Anotar endpoints con OpenAPI o usar tsoa | Alto | 4h | Media | Backend | T018 | Swagger UI accesible en `/api/docs` |
| T038 | Docker + docker-compose | Dockerfile multi-stage, compose con backend+frontend+pg local | Medio | 6h | Media | DevOps | T017 | `docker compose up` levanta stack completo |
| T039 | CI/CD GitHub Actions | Workflow: lint→test→build→deploy preview | Alto | 8h | Media | DevOps | T027, T028 | `git push` dispara CI; bloquea merge si tests fallan |
| T040 | Sentry | Integrar SDK en frontend y backend | Medio | 3h | Baja | DevOps | — | Error de prueba capturado en Sentry |
| T041 | Tests E2E (Playwright) | Flujo: login → crear registro → ver liquidación | Medio | 8h | Alta | QA | T029, T018 | E2E pasa en CI |
| T042 | Docs arquitectura + ADRs | Diagramas, decisiones arquitectónicas documentadas | Alto | 4h | Baja | Architect | T018 | ADRs en `/docs/adr/` |

**Total P3: 73h**

## Prioridad P4 — Rendimiento (Fase 5)

| ID | Título | Descripción | Impacto | Esfuerzo | Complejidad | Responsable | Depende de | Criterio de aceptación |
|----|--------|-------------|---------|----------|-------------|-------------|------------|----------------------|
| T043 | Optimizar índices + EXPLAIN | Analizar queries reales con EXPLAIN ANALYZE, ajustar índices | Medio | 4h | Media | DBA | T024 | Seq scan eliminado en queries por mes |
| T044 | Compresión HTTP | `compression` middleware en Express | Bajo | 1h | Baja | Backend | T018 | Respuestas comprimidas con gzip |
| T045 | Lazy loading rutas | `React.lazy` + `Suspense` en router | Bajo | 2h | Baja | Frontend | T029 | Bundle inicial <200KB |
| T046 | Auditoría params | Agregar `updated_at`, `updated_by` a tabla params | Bajo | 4h | Media | DBA | T023 | Cambios de params quedan registrados |
| T047 | Cache en memoria payroll | `node-cache` con TTL 5min para resultados de payroll | Medio | 3h | Media | Backend | T022 | Cache hit ratio >80% |

**Total P4: 14h**

## Prioridad P5 — Seguridad avanzada + IA (Fase 6)

| ID | Título | Descripción | Impacto | Esfuerzo | Complejidad | Responsable | Depende de | Criterio de aceptación |
|----|--------|-------------|---------|----------|-------------|-------------|------------|----------------------|
| T048 | HttpOnly cookies JWT | Migrar token a cookie HttpOnly+Secure+SameSite | Alto | 8h | Alta | Backend | T029 | Token no accesible vía `document.cookie` |
| T049 | Hash contraseñas bcrypt | Tabla `users`, bcrypt hash, eliminar admin/password | Alto | 6h | Media | Backend | T023 | Contraseña nunca se almacena en texto plano |
| T050 | Roles y permisos | Middleware de autorización por rol | Alto | 8h | Alta | Backend | T049 | Usuario sin permiso recibe 403 |
| T051 | Audit logging | Log de cambios en records, expenses, params | Medio | 4h | Media | Backend | T021 | Cada cambio tiene log con usuario y timestamp |
| T052 | Backups automatizados | Script pg_dump programado o copias en S3 | Medio | 4h | Media | DevOps | T023 | Backup diario, retención 30 días |
| T053 | PWA offline | Service Worker, manifest, cache de assets | Bajo | 8h | Alta | Frontend | T029 | App instalable y funcional offline |
| T054 | Accesibilidad WCAG 2.1 AA | ARIA, navegación teclado, focus management, contraste | Bajo | 16h | Alta | Frontend | T029 | axe audit 0 violaciones |
| T055 | IA: Detección de anomalías | Modelo estadístico para horas extras sospechosas | Bajo | 12h | Alta | Data | T020 | Reporte de registros anómalos generado |

**Total P5: 66h**

---

# 7. PLAN DE SPRINTS

## Supuesto de capacidade
2 desenvolvedores full-stack (1 backend-focused, 1 frontend-focused) + 1 DevOps part-time. Velocidade estimada: 40h/sprint (2 sem).

---

### Sprint 1 (Semana 1) — ESTABILIZACIÓN CRÍTICA

**Objetivo:** Eliminar todas las vulnerabilidades críticas. **Ningún otro trabajo se permite hasta completar este sprint.**

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T001 Rotar credenciales BD | DevOps | 1h |
| T002 Eliminar JWT secret hardcodeado | Backend | 1h |
| T003 Eliminar admin/password123 | Backend | 1h |
| T004 Fix SSL verification | Backend | 0.5h |
| T007 Validación env vars | Backend | 1h |
| T005 Helmet.js | Backend | 2h |
| T006 Rate limiting login | Backend | 2h |

**Capacidad usada: 8.5h/40h** (deliberadamente ligero — prioridad absoluta en seguridad)
**Entregables:** Vulnerabilidades críticas eliminadas; app deployable de forma segura
**Validaciones:** Login con credenciales por defecto falla; fuerza bruta bloqueada; headers A+ en securityheaders.com
**Riesgos:** Eliminación de fallbacks rompe dev local → Mitiga con T016 en Sprint 2

---

### Sprint 2 (Semana 2) — SEGURIDAD + QUICK WINS

**Objetivo:** Completar seguridad de alta prioridad + quick wins de código + documentación mínima

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T008 CORS restrictivo | Backend | 1h |
| T009 Sanitización inputs | Backend | 3h |
| T010 Limite body size | Backend | 0.1h |
| T016 Crear `.env.example` | DevOps | 0.5h |
| T011 Extraer tareasOptions | Frontend | 0.5h |
| T012 Extraer formatCurrency | Frontend | 0.5h |
| T013 Años dinámicos | Frontend | 0.5h |
| T014 Fix división float | Backend | 0.5h |
| T015 Reescribir README | Tech Writer | 2h |

**Capacidad usada: 8.6h/40h**
**Entregables:** Seguridad completa; deuda técnica menor eliminada; README útil
**Validaciones:** Intento de XSS almacenado es sanitizado; años select funciona en 2028

---

### Sprint 3 (Semanas 3-4) — PREPARACIÓN BACKEND TS

**Objetivo:** Configurar TypeScript en backend y crear estructura modular sin migrar lógica aún

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T017 Configurar TS backend | Backend | 4h |
| T023 Sistema migraciones | DBA + Backend | 8h |
| T022 DTOs y mappers | Backend | 2h |
| T026 Health check | Backend | 1h |
| Documentar ADR-001 (migración TS) | Architect | 2h |
| Documentar ADR-002 (sistema migraciones) | Architect | 2h |

**Capacidad usada: 19h/40h**
**Entregables:** Backend corre en TS; migraciones versionadas; health check funcional
**Validaciones:** `tsc --noEmit` pasa; `npm run migrate up` crea esquema limpio

---

### Sprint 4 (Semanas 5-6) — MODULARIZACIÓN BACKEND

**Objetivo:** Extraer routes, controllers, services y repositories del monolito

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T018 Separar routes | Backend | 4h |
| T019 Extraer controllers | Backend | 4h |
| T020 Extraer services | Backend | 4h |
| T021 Extraer repositories | Backend | 4h |
| T024 Índices + range queries | DBA | 4h |
| T025 Constraints integridad | DBA | 2h |

**Capacidad usada: 22h/40h**
**Entregables:** `index.js` reducido a ≤50 líneas; arquitectura por capas; índices aplicados
**Validaciones:** Endpoints responden igual que antes (regresión); EXPLAIN ANALYZE usa index

---

### Sprint 5 (Semanas 7-8) — TESTING BACKEND

**Objetivo:** Alcanzar 60% de cobertura en backend

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T027 Tests unitarios backend (parte 1: services) | QA | 6h |
| T027 Tests unitarios backend (parte 2: repositories) | QA | 6h |
| T028 Tests integración API | QA | 8h |
| Documentar estándares de testing | QA | 2h |

**Capacidad usada: 22h/40h**
**Entregables:** 60% cobertura backend; tests de integración para flujos críticos
**Validaciones:** `npm test -- --coverage` muestra ≥60% backend

---

### Sprint 6 (Semanas 9-10) — REACT ROUTER + FRONTEND

**Objetivo:** Introducir React Router y refactorizar AppContext

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T029 React Router | Frontend | 8h |
| T030 Refactor AppContext → React Query | Frontend | 12h |

**Capacidad usada: 20h/40h**
**Entregables:** Rutas declarativas; hooks de React Query; AppContext reducido
**Validaciones:** URLs profundas cargan vistas correctas; React Query cachea datos

---

### Sprint 7 (Semanas 11-12) — UX FRONTEND

**Objetivo:** Mejorar UX con loaders, toasts, error boundaries y PDF hook

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T031 Estados de carga | Frontend | 4h |
| T032 Sistema de toasts | Frontend | 4h |
| T033 Error Boundaries | Frontend | 2h |
| T034 Hook usePayrollPDF | Frontend | 2h |
| T036 Caché payroll RQ | Frontend | 2h |
| T037 Docs API OpenAPI | Backend | 4h |

**Capacidad usada: 18h/40h**
**Entregables:** UX mejorada; sin `alert()`; PDFs en un solo lugar
**Validaciones:** `grep -r "alert(" src/screens` no encuentra; skeletons visibles

---

### Sprint 8 (Semanas 13-14) — DEVOPS

**Objetivo:** Docker, CI/CD y observabilidad

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T038 Docker + compose | DevOps | 6h |
| T039 CI/CD GitHub Actions | DevOps | 8h |
| T040 Sentry | DevOps | 3h |
| T042 Docs arquitectura + ADRs | Architect | 4h |
| T035 Paginación API | Backend | 6h |

**Capacidad usada: 27h/40h**
**Entregables:** Docker compose levanta stack; CI bloquea merges sin tests; Sentry captura errores
**Validaciones:** `docker compose up` funciona; `git push` dispara CI; error aparece en Sentry

---

### Sprint 9 (Semanas 15-16) — E2E + RENDIMIENTO INICIAL

**Objetivo:** Tests E2E y optimizaciones de rendimiento

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T041 Tests E2E Playwright | QA | 8h |
| T043 Optimizar índices EXPLAIN | DBA | 4h |
| T044 Compresión HTTP | Backend | 1h |
| T045 Lazy loading rutas | Frontend | 2h |
| T047 Cache memoria payroll | Backend | 3h |

**Capacidad usada: 18h/40h**
**Entregables:** E2E pasa en CI; bundle optimizado; cache de payroll activo
**Validaciones:** LCP <2.5s; cache hit ratio >80%

---

### Sprint 10 (Semanas 17-18) — SEGURIDAD AVANZADA

**Objetivo:** HttpOnly cookies y hash de contraseñas

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T049 Hash contraseñas bcrypt | Backend | 6h |
| T048 HttpOnly cookies JWT | Backend | 8h |
| T051 Audit logging | Backend | 4h |

**Capacidad usada: 18h/40h**
**Entregables:** Contraseñas hasheadas; token en cookie segura; log de auditoría
**Validaciones:** `document.cookie` no expone token; bcrypt hash en BD

---

### Sprint 11 (Semanas 19-20) — ROLES + BACKUPS

**Objetivo:** Sistema de permisos y estrategia de backups

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T050 Roles y permisos | Backend | 8h |
| T052 Backups automatizados | DevOps | 4h |
| T046 Auditoría params | DBA | 4h |

**Capacidad usada: 16h/40h**
**Entregables:** Middleware de roles; backups diarios; cambios de params auditados
**Validaciones:** Usuario sin rol recibe 403; backup restaurable

---

### Sprint 12 (Semanas 21-23) — PWA + ACCESIBILIDAD

**Objetivo:** PWA y WCAG 2.1 AA

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T053 PWA offline | Frontend | 8h |
| T054 Accesibilidad WCAG | Frontend | 16h |

**Capacidad usada: 24h/40h** (3 semanas por complejidad de a11y)
**Entregables:** App instalable y offline; axe audit 0 violaciones
**Validaciones:** Lighthouse PWA score ≥90; axe 0 violaciones críticas

---

### Sprint 13 (Semanas 24-26) — IA + CIERRE

**Objetivo:** Prototipo de IA y cierre del plan

| Tarea | Responsable | Esfuerzo |
|-------|-------------|----------|
| T055 IA: Detección anomalías | Data | 12h |
| Documentación final + retro | Todos | 4h |

**Capacidad usada: 16h/40h**
**Entregables:** Reporte de registros anómalos; documentación completa
**Validaciones:** Detección identifica horas extras >2σ fuera de la media

---

# 8. RIESGOS Y MITIGACIONES

## Matriz de Riesgos

| # | Riesgo | Probabilidad | Impacto | Score | Mitigación | Plan de Contingencia | Indicador |
|---|--------|-------------|---------|-------|------------|----------------------|-----------|
| R1 | Credenciales BD ya comprometidas (git history) | Media | Crítico | 16 | Verificar con `git log --all -- .env`; rotar SIEMPRE | Rotación inmediata sin importar resultado | Logs de acceso a BD |
| R2 | Rotura de API durante modularización backend | Media | Alto | 12 | Tests de regresión antes/después de cada extracción | Rollback al monolito si tests fallan | `% tests pasando` |
| R3 | Migración a TS introduce errores de tipo | Baja | Medio | 6 | `strict: false` inicial; incrementar gradualmente | Revertir archivo problemático a JS | Cantidad de errores `tsc` |
| R4 | React Query + Router causa race conditions | Media | Medio | 9 | Migrar gradualmente; mantener switch como fallback | Revertir a Context si hay bugs | Errores en Sentry |
| R5 | Índices no mejoran rendimiento real | Baja | Bajo | 4 | Medir con EXPLAIN ANALYZE antes/después | Ajustar índices según queries reales | Tiempo de query |
| R6 | Fuerza bruta evade rate limiting (IP rotation) | Baja | Alto | 8 | Rate limiting por usuario además de IP | Implementar CAPTCHA después de N fallos | Intentos fallidos |
| R7 | Eliminación de fallbacks rompe despliegue Vercel | Media | Alto | 12 | Configurar env vars ANTES de eliminar fallbacks | Revertir commit; re-desplegar | Deploy exitoso |
| R8 | Sentry genera demasiado ruido | Media | Bajo | 6 | Configurar `beforeSend` y filtros | Desactivar temporalmente; purgar eventos | Eventos/día |
| R9 | Docker compose no replica Vercel serverless | Media | Medio | 9 | Documentar diferencias; usar Vercel CLI para staging | Probar deploy en preview Vercel | Diferencias de comportamiento |
| R10 | PWA offline causa datos stale | Media | Medio | 9 | Estrategia de invalidación clara (stale-while-revalidate) | Mostrar banner "datos offline" | Datos inconsistentes |

---

# 9. KPIs DE SEGUIMIENTO

## KPIs Técnicos

| KPI | Línea base | Meta | Frecuencia | Responsable |
|-----|-----------|------|-----------|-------------|
| Vulnerabilidades críticas abiertas | 4 | 0 (Sprint 1) | Semanal | Security |
| Vulnerabilidades altas abiertas | 5 | 0 (Sprint 2) | Semanal | Security |
| Cobertura tests backend | 5% | 60% (Sprint 5) | Por sprint | QA |
| Cobertura tests frontend | 0% | 40% (Sprint 7) | Por sprint | QA |
| Cobertura tests E2E | 0% | 1 flujo crítico (Sprint 9) | Por sprint | QA |
| Complejidad ciclomática (payroll.service) | ~12 | <8 (post-refactor) | Mensual | Backend |
| Deuda técnica (hallazgos abiertos) | 44 | 0 (Sprint 13) | Por sprint | EM |
| Tiempo medio respuesta `/api/records` | No medido | <200ms @1000 regs | Mensual | Performance |
| Tiempo medio respuesta `/api/payroll` | No medido | <300ms | Mensual | Performance |
| Tiempo de despliegue (push → live) | Manual | <5min (CI/CD) | Por sprint | DevOps |
| Disponibilidad | No medida | 99.5% | Mensual | DevOps |
| LCP (Largest Contentful Paint) | No medido | <2.5s | Mensual | Frontend |
| Bundle size (inicial) | No medido | <200KB | Por sprint | Frontend |
| Score Lighthouse PWA | 0 | ≥90 (Sprint 12) | Mensual | Frontend |
| Violaciones axe (accesibilidad) | No medido | 0 críticas (Sprint 12) | Mensual | Frontend |
| Deploys bloqueados por CI fallido | 0 (no hay CI) | 100% de deploys verificados | Por sprint | DevOps |

## KPIs de Proceso

| KPI | Meta | Frecuencia |
|-----|------|-----------|
| Sprints completados a tiempo | ≥85% | Por sprint |
| Tareas con criterio de aceptación cumplido | 100% | Por tarea |
| ADRs documentados | 5+ al final | Por fase |
| Pull requests con review aprobada | 100% | Por PR |

---

# 10. PLAN DE PRUEBAS

## Estrategia de Testing por Fase

### Fase 1 (Seguridad) — Pruebas de Seguridad
| Tipo | Tests | Herramienta | Relación con roadmap |
|------|-------|-------------|---------------------|
| Validación manual | Login con credenciales por defecto debe fallar | cURL | T002, T003 |
| Fuerza bruta | 6 intentos fallidos → 429 | Script bash | T006 |
| Headers | securityheaders.com nota A+ | Browser | T005 |
| XSS | Input `<script>alert(1)</script>` debe sanitizarse | cURL | T009 |

### Fase 2 (Backend) — Pruebas Unitarias e Integración
| Tipo | Tests | Herramienta | Relación con roadmap |
|------|-------|-------------|---------------------|
| Unit (services) | calculatePayroll con casos edge (0 records, max tramos impuesto) | Vitest | T027 |
| Unit (repositories) | CRUD records/expenses con mock de pg | Vitest | T027 |
| Integración | Login → crear record → recuperar → actualizar → eliminar → calcular payroll | Supertest | T028 |
| Regresión | Comparar respuestas de API antes/después del refactor | Script diff | T018-T021 |

### Fase 3 (Frontend) — Pruebas de Componentes
| Tipo | Tests | Herramienta | Relación con roadmap |
|------|-------|-------------|---------------------|
| Component | Login renderiza, submit llama API mock | Vitest + Testing Library | T029 |
| Component | Dashboard muestra datos del contexto mock | Vitest + Testing Library | T030 |
| Hook | useRecords llama endpoint correcto | Vitest + MSW | T030 |
| Router | Navegación a `/simulator` carga vista | Vitest + Testing Library | T029 |

### Fase 4 (DevOps) — Pruebas E2E y Performance
| Tipo | Tests | Herramienta | Relación con roadmap |
|------|-------|-------------|---------------------|
| E2E | Login → crear registro → ver liquidación → descargar PDF | Playwright | T041 |
| E2E | Navegación back/forward funciona | Playwright | T029 |
| Performance | 1000 registros en `/api/records` < 200ms | k6 | T035 |
| Smoke | Health check retorna 200 | cURL | T026 |

### Fase 5 (Performance) — Pruebas de Carga
| Tipo | Tests | Herramienta | Relación con roadmap |
|------|-------|-------------|---------------------|
| Load | 100 usuarios concurrentes en `/api/payroll` | k6 | T047 |
| Load | 1000 registros con paginación | k6 | T035 |
| Benchmark | Cache hit ratio payroll >80% | Logs | T047 |

### Fase 6 (Seguridad Avanzada) — Pruebas de Seguridad
| Tipo | Tests | Herramienta | Relación con roadmap |
|------|-------|-------------|---------------------|
| Auth | Token en cookie HttpOnly no accesible por JS | Browser console | T048 |
| Authz | Usuario sin rol recibe 403 | Supertest | T050 |
| Audit | Cambios en params generan log de auditoría | Query SQL | T051 |
| A11y | axe audit 0 violaciones críticas | axe-core | T054 |

---

# 11. DOCUMENTACIÓN REQUERIDA

## Documentos a Crear/Actualizar

| # | Documento | Tipo | Sprint | Autor | Descripción |
|---|-----------|------|--------|-------|-------------|
| D01 | README.md | Actualizar | Sprint 2 | Tech Writer | Objetivo, setup, env vars, scripts, deploy |
| D02 | `.env.example` | Crear | Sprint 2 | DevOps | Template con placeholders para todas las env vars |
| D03 | ADR-001: Migración backend a TypeScript | Crear | Sprint 3 | Architect | Contexto, decisión, consecuencias |
| D04 | ADR-002: Sistema de migraciones DB | Crear | Sprint 3 | Architect | node-pg-migrate vs Knex vs Prisma |
| D05 | ADR-003: Arquitectura por capas backend | Crear | Sprint 4 | Architect | routes → controllers → services → repos |
| D06 | ADR-004: React Router vs navegación por tabs | Crear | Sprint 6 | Architect | Decisión y migración gradual |
| D07 | ADR-005: React Query como capa de datos | Crear | Sprint 6 | Architect | Reemplazo de AppContext |
| D08 | API docs (OpenAPI/Swagger) | Crear | Sprint 7 | Backend | Endpoints, schemas, ejemplos |
| D09 | Diagrama de arquitectura | Crear | Sprint 8 | Architect | Diagrama C4 nivel 2 (containers) |
| D10 | CONTRIBUTING.md | Crear | Sprint 8 | EM | Estándares de código, PR, commits |
| D11 | Guía de despliegue | Crear | Sprint 8 | DevOps | Pasos para deploy en Vercel |
| D12 | Estándares de testing | Crear | Sprint 5 | QA | Estructura, naming, coverage mínima |
| D13 | Runbook de incidentes | Crear | Sprint 9 | DevOps | Procedimientos para incidencias comunes |
| D14 | Documentación final + retrospectiva | Crear | Sprint 13 | EM | Resumen del plan, lecciones aprendidas |

---

# 12. CRONOGRAMA SUGERIDO

```
Semana  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
        ├──┼──┤
Sprint 1    │  Stabilización Crítica (P0)
            ├──┤
Sprint 2       │  Seguridad + Quick Wins (P1)
               ├──────┤
Sprint 3-4         │      Modularización Backend TS (P2)
                   ├──────┤
Sprint 5               │      Testing Backend (P2)
                       ├──────┤
Sprint 6                   │      React Router + RQ (P3)
                           ├──────┤
Sprint 7                       │      UX Frontend (P3)
                               ├──────┤
Sprint 8                           │      DevOps (P3)
                                   ├──────┤
Sprint 9                               │      E2E + Performance (P3-P4)
                                       ├──────┤
Sprint 10                                  │      Seguridad Avanzada (P5)
                                          ├──────┤
Sprint 11                                     │      Roles + Backups (P5)
                                              ├──────┤
Sprint 12                                          │      PWA + A11y (P5)
                                                  ├──────┤
Sprint 13                                              │      IA + Cierre
```

## Resumen de Esfuerzo

| Fase | Sprints | Semanas | Esfuerzo | % Total |
|------|---------|---------|----------|---------|
| Fase 0-1 Estabilización | 2 | 2 | 17h | 9% |
| Fase 2 Backend | 3 | 4 | 57h | 30% |
| Fase 3 Frontend | 2 | 4 | 32h | 17% |
| Fase 4 DevOps | 2 | 4 | 36h | 19% |
| Fase 5 Performance | 1 | 4 | 14h | 7% |
| Fase 6 Avanzado | 3 | 8 | 66h | 34% |
| **TOTAL** | **13** | **26** | **222h** | **100%** |

> Nota: El total (222h) supera la simple suma porque incluye overhead de documentación y coordinación. Con 2 devs a 40h/sprint = 1040h disponibles en 26 semanas, el plan usa ~21% de la capacidad, dejando margen para feature work, soporte y holidays.

---

# 13. CONCLUSIONES

## ¿Qué se debe hacer primero y por qué?

**La rotación de credenciales de base de datos (T001) y la eliminación de secretos hardcodeados (T002, T003, T004)** deben ejecutarse en las primeras 4 horas de trabajo. Estas son vulnerabilidades críticas que permiten compromiso total del sistema. Ningún otro trabajo tiene sentido si el sistema puede ser comprometido.

## ¿Qué tareas pueden ejecutarse en paralelo?

| Paralelizable | Bloqueado por |
|---------------|---------------|
| Frontend (Sprints 6-7) ←→ Backend testing (Sprint 5) | Solo si Sprint 4 (modularización) está completo |
| DevOps Docker (T038) ←→ OpenAPI docs (T037) | Ambos dependen de Sprint 4 |
| IA detección anomalías (T055) ←→ PWA (T053) | Ambos en Sprint 12-13, pueden paralelizarse |
| Acessibilidad (T054) ←→ Backups (T052) | Sprint 11-12 pueden solaparse |

Con 2 devs (1 BE, 1 FE), el paralelismo natural es: cuando Backend hace Sprint 4-5, Frontend puede hacer T011-T013 (quick wins) y preparar T029. Cuando Frontend hace Sprint 6-7, Backend puede hacer T035 (paginación) y T037 (OpenAPI).

## ¿Qué cambios representan mayor riesgo?

1. **T048 (HttpOnly cookies)** — Riesgo: complejidad en serverless sin dominio propio. Mitigación: posponer a Fase 6, requerir dominio configurado en Vercel.
2. **T017 + T018-T021 (Migración TS + modularización)** — Riesgo: rotura de API. Mitigación: tests de regresión antes de cada extracción.
3. **T030 (React Query migration)** — Riesgo: race conditions. Mitigación: migración gradual con coexistencia de Context y Query.
4. **T023 (Sistema migraciones)** — Riesgo: migración inicial puede corromper BD. Mitigación: backup antes de aplicar.

## ¿Qué mejoras generan el mayor retorno con menor esfuerzo?

| Quick Win | Esfuerzo | Retorno |
|-----------|----------|--------|
| T001-T004 (Secretos) | 3.5h | Elimina 4 vulnerabilidades críticas |
| T005-T006 (Helmet + Rate Limit) | 4h | Elimina 2 vulnerabilidades altas |
| T011-T012 (Extraer duplicados) | 1h | Reduce deuda técnica de inmediato |
| T015 (README) | 2h | Habilita onboarding de nuevos devs |
| T014 (Fix float) | 0.5h | Garantiza precisión financiera |

## ¿Qué dependencias bloquean otras tareas?

```
T007 (env vars) ──blocks──→ T017 (TS backend) ──blocks──→ T018 (routes) ──blocks──→ T028 (integration tests)
                                                                         └──blocks──→ T041 (E2E)

T029 (Router) ──blocks──→ T041 (E2E)
                 └──blocks──→ T045 (lazy loading)
                 └──blocks──→ T053 (PWA)
                 └──blocks──→ T054 (a11y)

T023 (migraciones) ──blocks──→ T024 (índices) ──blocks──→ T043 (EXPLAIN)
                    └──blocks──→ T046 (auditoría params)
                    └──blocks──→ T049 (users table)
```

## ¿Cuál es el orden óptimo de implementación?

1. **Sprint 1:** Secretos + rate limiting + helmet (P0)
2. **Sprint 2:** Sanitización + CORS + quick wins + README (P1)
3. **Sprint 3-4:** TS + modularización + migraciones + índices (P2)
4. **Sprint 5:** Tests backend 60% (P2)
5. **Sprint 6-7:** React Router + React Query + UX (P3)
6. **Sprint 8-9:** Docker + CI/CD + Sentry + E2E (P3-P4)
7. **Sprint 10-11:** HttpOnly cookies + bcrypt + roles + backups (P5)
8. **Sprint 12-13:** PWA + a11y + IA + cierre (P5)

Este orden maximiza la reducción de riesgo temprano, libera dependencias críticas ASAP, y permite paralelismo entre backend y frontend.

---

# 14. PRÓXIMOS PASOS

## Acciones inmediatas (hoy)

1. **Ejecutar:** `git log --all --full-history -- .env` para verificar si `.env` fue commiteado
2. **Asignar:** Designar al Engineering Manager como owner del plan de remediación
3. **Crear:** Board en GitHub Projects con las 55 tareas del backlog
4. **Reservar:** Sprint 1 en el calendario (esta semana, 8.5h de foco exclusivo)
5. **Comunicar:** Avisar al equipo que ninguna nueva feature se desarrolla hasta completar Sprint 2

## Acciones de la semana 1

1. Completar Sprint 1 (estabilización crítica)
2. Completar Sprint 2 (seguridad + quick wins)
3. Verificar que el despliegue en Vercel funciona con env vars configuradas
4. confirmar con security audit manual que las vulnerabilidades críticas están cerradas

## Criterio de "Go/No-Go" para continuar a Fase 2

Antes de iniciar el Sprint 3 (modularización backend), se debe verificar:
- [ ] 0 vulnerabilidades críticas abiertas
- [ ] 0 vulnerabilidades altas abiertas
- [ ] `.env` eliminado del filesystem
- [ ] Credenciales rotadas y configuradas en Vercel
- [ ] App deployable y funcional en producción con la configuración segura
- [ ] README actualizado con setup correcto

Si cualquier criterio falla, **no avanzar a Fase 2** hasta resolverlo.

---

*Plan Maestro de Remediación — Horas Extras Entel*
*Generado el 28 de Julio de 2026*
*Equipo: 14 roles de ingeniería empresarial*
*Documento de referencia: AUDITORIA_TECNICA.md*