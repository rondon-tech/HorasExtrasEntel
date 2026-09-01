# AUDITORÍA TÉCNICA INTEGRAL — HorasExtrasEntel (`horas-extras-app`)

**Fecha:** 28 de agosto de 2026
**Alcance:** proyecto completo (77 archivos de código en `src/`, `server/`, `api/`; configs, CI/CD, Docker, migraciones, scripts, documentación)
**Método:** lectura exhaustiva de todos los archivos + verificación empírica (`npm audit`, `npm outdated`, `npm run lint`, `npm run typecheck`, `npm test`, `git ls-files`, spot-checks de cada hallazgo crítico)

---

## 1. Resumen Ejecutivo

**HorasExtrasEntel** es una app full-stack (React 19 + Vite 8 + Express 5 + PostgreSQL/Neon en Vercel serverless) con la que técnicos de campo de Entel Chile registran horas extras, viáticos y días TAD/Contingencia, y obtienen el cálculo automático de su liquidación según legislación chilena. Está **en producción** con usuarios reales.

### Veredicto general

El proyecto tiene **bases muy superiores a la media de un MVP**: arquitectura en capas documentada con ADRs, multi-tenancy a prueba de IDOR, cero SQL injection por diseño, tests de la lógica monetaria, CI completo y backups automáticos. **Sin embargo, no está listo para considerarse "producto de nivel empresarial"**: la auditoría encontró **5 hallazgos críticos y ~15 de severidad alta**, varios de ellos con impacto directo en dinero, auditoría legal o seguridad.

### Lo más grave (verificado uno a uno)

| # | Hallazgo | Impacto | Ref |
|---|---|---|---|
| 1 | **Payroll falsificable**: `extraHours` lo define el cliente sin tope y el servidor lo paga sin recalcular | Fraude directo en liquidaciones | `server/schemas/record.schema.js:14`, `server/services/payroll.service.js:16-17` |
| 2 | **Auditoría de cambios de contraseña se pierde silenciosamente**: `audit_log.action` es `VARCHAR(10)` y se insertan `'PASSWORD_RESET'` (14) y `'PASSWORD_CHANGE'` (15) → error `22001` tragado por un `catch {}` | Incumplimiento de trazabilidad; nadie enterado | `server/migrations/003_audit-log.js:12`, `server/utils/audit.js:14-16` |
| 3 | **Endpoint de debug expuesto** `/api/debug/db-check` (solo `requireAuth`): vuelca esquema de BD a cualquier usuario autenticado y filtra `err.stack` fuera de producción | Reconnaissance de BD | `api/index.js:106-142` |
| 4 | **La app de emergencia crashea**: `app.all('*', …)` es sintaxis inválida en Express 5 → el lambda muere exactamente cuando faltan env vars, dejando error opaco | Diagnóstico imposible en incidente | `api/index.js:40` |
| 5 | **Errores de carga silenciados en frontend**: si `/payroll` falla, la UI muestra "Líquido a pagar: $0" como si fuera real | Desconfianza / decisiones erróneas con datos falsos | `src/context/AppContext.tsx:151-197` |

Adicionalmente: **5 vulnerabilidades High** en dependencias (fix disponible con `npm audit fix`), **ruta `/change-password` inexistente** (el botón del Perfil deja pantalla en blanco), **TypeScript sin `strict`** con 26 `any` en la capa de datos, y backups **sin cifrar** con PII a pesar de tener `sodium-native` instalado y sin usar.

### Calificación global (1–10)

| Dimensión | Nota | Justificación breve |
|---|---|---|
| Arquitectura | **7** | Capas correctas y ADRs; service layer incompleta (lógica en controllers), God-Context en FE |
| Calidad de código | **6.5** | Limpio y consistente, pero código muerto, schemas/mappers sin usar, 6 warnings de lint, TS sin strict |
| Seguridad | **5.5** | Defensa en profundidad real, pero 3 críticos (payroll falsificable, audit truncado, debug endpoint) y CORS/CORS+headers débiles |
| Rendimiento | **7** | Caché de payroll + code-splitting correctos; jsPDF en chunk inicial, agregaciones en Node, índices mal orientados |
| Escalabilidad | **6** | Serverless + Neon escala bien hasta miles de usuarios; pool sin límites por lambda, failover con split-brain |
| UX | **6** | Responsive y flows correctos; ruta rota, errores silenciados, a11y baja (0 `htmlFor`) |
| DevOps | **7** | CI sólida, backups cada 2h, secrets hygiene impecable; sin audit/SAST, Sentry sin inicializar, Docker como root |
| Testing | **6** | 34 tests passing sobre lo crítico (Money, payroll, mappers, repos, auth); 0 tests de integración E2E ni de rutas HTTP |
| Documentación | **9** | Excepcional: 4 ADRs, contexto, OpenAPI, errores conocidos — mejor punto del proyecto |
| Mantenibilidad | **6.5** | Bien organizado pero con drift doc-código, dead code y mezcla JS/TS en backend |
| **Global ponderada** | **6.5** | Buen producto MVP con riesgo empresarial concreto en seguridad de dinero y auditoría |

---

## 2. Arquitectura Actual (Fases 1–3)

### 2.1 Comprensión del sistema

- **Usuarios:** técnicos de campo (rol `user`) + administrador global (rol `global_admin`). Multi-tenant por `user_id`.
- **Flujo:** login (JWT 12h) → registro diario de horas extras (`POST /api/records`) y gastos (`POST /api/expenses`) → cálculo server-side de liquidación (`GET /api/payroll/:year/:month`, caché 5 min) → export PDF client-side (jsPDF).
- **Reglas de negocio clave** (`server/services/payroll.service.js`): tarifa hora extra = `round((base+incentivo)/120)`; bonos TAD/Contingencia por día único; descuentos legales AFP 11.27% + salud 7% + cesantía 0.6%; impuesto único por tramos hardcodeados; líquido = imponibles − legales − impuesto + exentos − varios.
- **Infra:** Vercel serverless (FE estático + `api/index.js` Express), Neon Postgres primario + fallback, backups cada 2h a Cloudflare R2 desde GitHub Actions, PWA con service worker.

### 2.2 Inventario (Fase 2)

| Elemento | Contenido | Estado |
|---|---|---|
| `api/index.js` | App Express completa (middlewares, 5 routers, health, debug) | 1 archivo monolítico de bootstrap |
| `server/config` | `env.ts` (validación fail-fast), `db.js`, `db-failover.js` (PoolManager dual-DB) | Funcional con defectos (ver D-1/D-2) |
| `server/controllers` | 6 controllers (~60 líneas c/u) | Contienen lógica de negocio que debería estar en services |
| `server/services` | `payroll.service.js` (+test), `email.service.js` | Solo payroll extraído a service |
| `server/repositories` | 4 repos + tests, SQL 100% parametrizado | **Fortaleza** |
| `server/middlewares` | auth, role, password-change, validate, errorHandler | auth/role testeado |
| `server/schemas` | 5 schemas zod | `auth.schema.js` **sin usar** |
| `server/mappers` | DTO mapping (+test) | 2 mappers **sin usar** en producción |
| `server/migrations` | 7 migraciones node-pg-migrate reversibles | **Fortaleza**; 003 con defecto crítico |
| `src/screens` | 11 pantallas lazy-loaded (97–323 líneas) | Sin gigantes; 2 con fetch manual fuera del patrón |
| `src/context` | `AuthContext`, `AppContext` (God-Context: 38 campos) | A refactorizar |
| `src/hooks` | `useApi.ts` (todas las queries/mutations React Query) | 26 `any`; 2 hooks muertos |
| `src/components` | 7 componentes (13–140 líneas) | Correcto |
| `scripts` | backup, restore, check-env, detect-anomalies | backup/restore con defectos graves; detect-anomalies con import roto |
| `docs` | 4 ADRs, contexto completo, OpenAPI | **Fortaleza** |
| Dependencias muertas | `@sentry/node` (nunca `init`), `sodium-native` (nunca importada) | Eliminar o usar |

### 2.3 Evaluación de arquitectura

- ✅ **Layered correcta en papelo** (routes → controllers → repositories) y ADR-001 la documenta. SQL aislado en repos, DTOs en mappers, validación en schemas.
- ❌ **Service layer incompleta**: solo payroll tiene service. `register` (auth.controller.js:61-127) hace validación + bcrypt + INSERT + params + email + JWT + auditoría en un solo método → inmantenible y no testeable.
- ❌ **Acoplamiento controller↔controller**: record/expense/params controllers importan `payrollController` para invalidar caché (`payrollCache.clear()` global — invalida a TODOS los usuarios por la mutación de uno).
- ❌ **Efecto secundario en GET**: `GET /api/params` crea la fila si no existe (params.controller.js:10-14) — rompe idempotencia HTTP.
- ✅ SOLID parcial (SRP violado en controllers, DIP innecesario aquí), KISS/YAGNI razonables, DRY con excepciones (validación manual triplicada, spinner duplicado ×6, parsing de errores ×4).
- **Frontend:** God-Context (AppContext expone 38 campos → cualquier cambio re-renderiza todo), 3 estilos de data-fetching conviviendo (React Query + fetch manual en AdminPanel/Profile + hooks muertos).

**Arquitectura objetivo propuesta:** extraer `userService`/`authService`; encapsular caché de payroll en el service; usar los mappers y schemas ya existentes (o borrarlos); en FE dividir AppContext en Records/Params/Payroll o eliminar el contexto-puente consumiendo React Query directamente (ADR-004 ya justifica React Query como capa de estado).

---

## 3. Fortalezas

1. **Cero SQL injection por diseño** — las ~40 queries usan exclusivamente placeholders `$n`; no hay una sola concatenación.
2. **Multi-tenancy a prueba de IDOR** — `records`/`expenses`/`params` siempre filtran `user_id` del JWT, nunca del body; FKs con CASCADE + índices por usuario.
3. **Dinero con aritmética entera y tests** — clase `Money` (server/utils/money.ts) con tests de flotantes; payroll testado contra tramos.
4. **Documentación de ingeniería excepcional** — ADRs, convenciones, errores conocidos con causa/fix, OpenAPI, glosario.
5. **Operación consciente del serverless** — logger stdout-only en Vercel, rate-limit en edge por la limitación del store en memoria, migraciones versionadas con rollback, health check con probe real a BD.
6. **Secrets hygiene impecable** — verificado: nada sensible commiteado ni en la imagen Docker; `.env` correctamente ignorado.
7. **Frontend resiliente** — code-splitting por ruta, ErrorBoundary por pantalla, interceptor 401 → logout centralizado, confirmaciones destructivas consistentes en los 3 flujos de borrado.
8. **Defensa en profundidad coherente** — helmet + doble rate-limit + zod + sanitización + bcrypt + `password_change_required` forzado por middleware.

---

## 4. Debilidades (Fases 4–13: hallazgos por categoría)

### 4.1 🔴 Críticos

| ID | Área | Hallazgo | Evidencia | Solución |
|---|---|---|---|---|
| C-1 | Negocio/Seguridad | **Payroll falsificable**: `extraHours` sin `.max()` y no verificado contra `start_time/end_time`; el servidor lo paga directo | `record.schema.js:14`, `payroll.service.js:16-17` | `.max(12)` en schema + recalcular horas desde `start/end` server-side + tope mensual legal (Ley 21.561) |
| C-2 | Auditoría | **`audit_log.action VARCHAR(10)`**: `'PASSWORD_RESET'`/`'PASSWORD_CHANGE'` lanzan `22001` y `audit.js` lo traga con `catch {}` → resets y cambios de contraseña **sin registro** | `003_audit-log.js:12`, `admin.controller.js:20`, `auth.controller.js:169` | Migración 008: `ALTER COLUMN action TYPE VARCHAR(30)` + `logger.error` en el catch |
| C-3 | Seguridad | **Debug endpoint en producción** con volcado de `information_schema` y `err.stack` | `api/index.js:106-142` | Envolver en `NODE_ENV !== 'production'` o eliminar |
| C-4 | Robustez | **App de emergencia crashea al montar**: `app.all('*')` inválido en Express 5 (path-to-regexp 8) | `api/index.js:40` | `app.use((req,res)=>…)` sin path, o `'/​{*splat}'` |
| C-5 | Frontend | **Ruta `/change-password` inexistente**: el botón del Perfil deja pantalla en blanco (sin 404 catch-all) | `Profile.tsx:81`, `App.tsx:112-122` | Añadir `<Route path="/change-password">` + `Route path="*"` → NotFound |
| C-6 | Frontend/UX | **Errores de query silenciados → liquidación a $0 sin aviso**: AppContext expone `isLoading` pero jamás `isError` | `AppContext.tsx:151-197` | Exponer error por query + banner/estado de error con "Reintentar" |
| C-7 | Calidad | **TypeScript sin `strict`** + 26 `any` en la capa de datos (mutaciones de records/expenses sin tipado → typos silenciosos) | `tsconfig.app.json`, `useApi.ts:63-139` | `"strict": true` + tipar mutaciones con los tipos ya existentes en AppContext |
| C-8 | Dependencias | **5 vulns High** (react-router-dom CSRF GHSA-qwww-vcr4-c8h2, brace-expansion, postcss, nanoid, +1 moderate dompurify) | `npm audit` | `npm audit fix` (todas con fix en rango semver) |

### 4.2 🟠 Altos

**Backend/Seguridad**
- **Login con swallow de errores + fallback a credenciales de env + timing attack**: el `catch` degrada a `ADMIN_PASSWORD` de env sin log; sin bcrypt cuando el usuario no existe → enumeración medible; comparación no constante (`auth.controller.js:23-55`). → Hash dummy + `crypto.timingSafeEqual` + log del error.
- **Contraseñas temporales en logs y en la respuesta HTTP** (`email.service.js:26-28`, `auth.controller.js:123`). → Nunca loguear credenciales; quitar `tempPassword` de la respuesta cuando el email esté activo.
- **Reset de contraseña no revoca tokens**: sin `token_version`; `password-change.js` decide sobre el claim del JWT, no sobre la BD → token robado válido 12h. → `token_version` verificado contra BD en `requireAuth`.
- **CORS wildcard `*.vercel.app` con `credentials:true`** — cualquier despliegue de terceros en vercel.app pasa; el rechazo además produce 500 en vez de 403 (`api/index.js:75-81`). → Allowlist explícita + `callback(null, false)` + quitar credentials.
- **errorHandler filtra detalles de PG** (constraint/detail a 4xx y 5xx) y **loguea `req.body` completo** (contraseñas) en todo error (`errorHandler.js:6-24`). → Mensaje genérico en 5xx + redactar `password*` antes de loguear.
- **JWT**: sin issuer/audience, sin refresh, `JWT_SECRET` sin longitud mínima (`env.ts:53`). → ≥32 chars, `expiresIn: 2h` + refresh.

**Base de datos**
- **Failover dual-DB sin reconciliación** → split-brain: al volver al primary se pierde todo lo escrito en el fallback (`db-failover.js:122-186`). → Failover solo-lectura o confiar en HA de Neon.
- **Pool error handler nunca registrado** (lazy-init): un error de client idle → `unhandled 'error' event` que puede tumbar la instancia (`db.js:21-28`). → Registrar listener dentro de `PoolManager.init()`.
- **Sin transacciones** en register (usuario sin params si falla el segundo INSERT), check-then-insert con carrera, TOCTOU en params → añadir `withTransaction()` + `ON CONFLICT DO NOTHING`.
- **Índices que no sirven**: filtros por `(user_id, EXTRACT(YEAR/MONTH))` sin índice combinado → `CREATE INDEX idx_records_user_date ON records(user_id, date)` + queries por rango sargable.
- **`audit_log` con `ON DELETE CASCADE`**: borrar un usuario arrasa su trail de auditoría (migración 005:66-69) → `SET NULL`.

**Negocio**
- **Tramos de impuesto hardcodeados y desactualizados** (UTM chileno se indexa mensualmente; `payroll.service.js:63-69`); la columna `impuesto_rate` quedó sin usar. → Tabla `tax_brackets` con vigencia.
- **Divisor 120 mágico** ignora `params.horas_jornada` (`payroll.service.js:12-14`).
- **Viáticos**: cuenta cualquier gasto como viático y los trata como imponibles (dudoso legalmente) (`payroll.service.js:21,48`).
- **Fechas con `toISOString()`** sobre `DATE` de pg → desfase de un día si la TZ del proceso es UTC+X (`payroll.service.js:24-41`, `mappers/index.ts:131,151`).

**Frontend**
- **JWT en localStorage** sin CSP en el SPA (helmet solo cubre `/api/*`, y con `'unsafe-inline'`) (`client.ts:11`, `index.html`, `vercel.json`). → Cookie httpOnly o CSP estricta sin unsafe-inline.
- **`register` secuestra la sesión del admin** (queda logueado como el usuario nuevo) y la contraseña temporal se descarta (`AuthContext.tsx:66-75`, `Register.tsx:34`).
- **Contraseña temporal en toast efímero de 4s** en el reset de AdminPanel (`AdminPanel.tsx:174`) → modal persistente con botón copiar.
- **Clobbering de formularios**: el refetch sobrescribe ediciones en curso (`DailyRecord.tsx:29-45`, `History.tsx:14-16`).
- **`limit=100` silencioso**: RecordsList, sus totales y el PDF se truncarían sin aviso a partir del registro 101 (`useApi.ts:32,41`).
- **jsPDF+autotable (~400 kB) en el chunk inicial** de Dashboard/RecordsList → dynamic `import()`.
- **Backup/restore artesanal roto**: JSONB serializado como `[object Object]`, restore partida por `\n`, orden de tablas viola FKs, sin transacción → **usar `pg_dump`/`pg_restore`**. Backup **sin cifrar** pese a tener `sodium-native` sin usar.

**DevOps**
- Docker corre como **root** y sin HEALTHCHECK; Sentry instalado pero **nunca inicializado** (cero error tracking real); CI sin `npm audit` ni secret scanning ni Dependabot; workflows sin `permissions:` explícito; sin alerta de fallo de backup.

### 4.3 🟡 Medios (selección)

| Área | Hallazgo | Ref |
|---|---|---|
| Logger | **Winston descarta toda la metadata estructurada** (`printf` solo imprime `stack \|\| message`) → los logs no contienen lo que dicen contener | `logger.js:5-7` |
| Rate-limit | Store en Map por-isolate (límite real = N_instancias × max); duplicado entre `middleware.ts` y `auth.routes.js`; `max` deprecado en v8 | `middleware.ts:22-25` |
| DB | Contador de fallos sin decaimiento → failover por blips espaciados; pool sin `max` por lambda contra Neon directo (riesgo `53300`) | `db-failover.js` |
| Scripts | `detect-anomalies.mjs:14` importa módulo inexistente (`api/config/env.js`) → **script roto siempre**; backup/restore sin TLS verification | `scripts/` |
| Health | `/api/health` filtra `err.message` de pg en 503 | `api/index.js:102` |
| React Query | `new QueryClient()` sin defaults: reintenta 401/403 ×3; `refetchOnWindowFocus` agrava el clobbering | `main.tsx:11` |
| CSS | **~25 clases usadas que no existen** (`text-green`, `text-secondary` en spans, `var(--card-bg)` inexistente → botones sin fondo); `App.css` 100% muerto (plantilla Vite) | `src/index.css`, `App.css` |
| A11y | 0 `htmlFor` en todo el proyecto; BentoCard clickable sin teclado; ConfirmDialog sin `role="dialog"`/focus trap/Escape | `src/` |
| SW/PWA | `skipWaiting` + borrado de caché en activate → chunks 404 en pestañas abiertas tras deploy; deep-links offline rotos; fallback de API es código muerto | `public/sw.js` |
| UX | Turno nocturno mostrado como error rojo; label "Total Horas Extras Calculadas" engañoso; `alert()` mezclado con toasts; sin `autoComplete` en Login | varias |
| QuickAdd | Heurística `isGhost = extraHours === 0` puede exponer/borrar registros reales | `QuickAddModal.tsx:76` |

### 4.4 🔵 Bajos (resumen)

`GLOBAL_ADMIN_ID` triplicado; docstrings mentirosos (role.js documenta roles que no existen); `toParamsDTO` con `\|\|` convierte `prestamo: 0` en 10000; UPDATE/DELETE sin chequeo de `rowCount` (falsos éxitos); sin UNIQUE `(user_id, date, start_time)` ni en `users.email`; doble redondeo en tarifa de hora extra; acumulación float de horas; `tempPassword` calculada antes de validar; `console.log` ×12 en producción; spinner duplicado ×6; `useRegister`/`useChangePassword` muertos; composición de font por `@import`; Compose `version:` obsoleta; `.dockerignore` incompleto; bcrypt cost 10 (subir a 12).

---

## 5. Riesgos (Fase 5 + matriz)

| Riesgo | Probabilidad | Impacto | Nivel |
|---|---|---|---|
| Fraude de horas extras por un técnico (C-1) | Alta | Financiero/legal directo | **Crítico** |
| Incidente de seguridad sin trazabilidad de resets de contraseña (C-2) | Media | Legal/audit, reputacional | **Crítico** |
| Pérdida de datos escritos durante failover (D-1) | Baja | Irrecuperable | Alto |
| Takedown de instancia por unhandled error event del pool (D-2) | Media | Disponibilidad | Alto |
| Backup inutilizable en el momento del desastre (backup.mjs/restore.mjs) | Media | Pérdida total | Alto |
| Deploy rompe pestañas PWA abiertas (sw.js) | Alta (cada deploy) | Confusión, errores | Medio |
| Informe payroll a $0 por error de red (C-6) | Media | Decisión errónea | Alto |
| XSS (localStorage + sin CSP + unsafe-inline) | Baja | Sesión comprometida | Alto |
| Impuesto único desactualizado por UTM (N-2) | Alta (ya está mal) | Liquidaciones incorrectas | Alto |

---

## 6. Escalabilidad (Fase 14)

| Escenario | Comportamiento previsto | Cuello de botella |
|---|---|---|
| 100 usuarios | Sin problemas | — |
| 1.000 usuarios | OK con caché de payroll 5 min | Pool: 1.000 lambdas × `max:10` contra Neon directo → `too_many_connections` (D-4). Usar endpoint pooled de Neon + `max: 3-5` |
| 10.000 usuarios | Degrada en login y escritura | Rate-limit en Map por-isolate inefectivo → Redis (Upstash); validación/bcrypt por request ok |
| 100.000 usuarios | Requiere re-ingeniería | Cache Map crece sin límite (P-3); payroll por request; sin paginación real; jobs (email) síncronos |
| 1M registros | `findByMonth` OK por índice nuevo; **RecordsList y PDF truncados a 100** (R4); agregaciones anuales imposibles client-side | Sin paginación server-side ni agregaciones SQL |
| 10M registros | Requiere particionado por mes/año en `records`, materialized views para reportes, y cola para emails | — |

---

## 7. Inteligencia Artificial (Fase 15) — oportunidades

| Oportunidad | Beneficio | Complejidad | Costo | Prioridad |
|---|---|---|---|---|
| **OCR de tickets de gastos** (foto del boleta → monto/fecha/nemonico prellenado en Expenses) | Ahorra el paso más lento del flujo diario | Media | API vision (~$0.001/foto) o modelo on-device | **Alta** |
| **Detección de anomalías en línea**: evolucionar `detect-anomalies.mjs` (hoy roto y offline) a modelo estadístico por usuario que bloquee/flaggee registros sospechosos en `POST /records` — complementa C-1 | Cierra el hueco de fraude | Baja-Media | Mínimo (z-scores/Isolation Forest sobre datos existentes) | **Alta** |
| **Clasificación automática de `nemonico`** de gastos a partir del texto del detalle | Datos más limpios → viáticos correctos (N-4) | Baja | Mínimo | Media |
| **Predicción de horas extras del mes** (proyección de liquidación a fin de mes en Dashboard) | Valor diferencial para el técnico | Media | Mínimo (regresión simple primero) | Media |
| **Asistente conversacional** ("¿cuántas horas llevo en agosto?", "repítame mi liquidación") vía LLM con tool-calling sobre la API existente | Adopción y soporte | Alta | $$ por token | Baja |
| **Generación automática de resúmenes mensuales** para el admin (LLM sobre el payroll agregado) | Ahorro de tiempo admin | Baja | Bajo | Baja |

---

## 8. Testing (Fase 10)

**Estado actual (evidencia):** 5 suites / 34 tests, **todos pasando** (mappers, repositories con mock del pool, money, payroll.service, auth/role middlewares). Lint: 6 warnings / 0 errors. Typecheck backend: ✅.

**Faltantes:**
1. **Integración HTTP** (supertest instalado pero sin usar): rutas reales con BD de test — auth flow completo, IDOR entre usuarios, validaciones de schema.
2. **Casos de payroll adversos**: `extraHours` enorme, fechas DST, turno nocturno cruzando medianoche, `endTime < startTime`, regex `99:99`.
3. **E2E** (Playwright): login → registro → liquidación → PDF.
4. **Cobertura** medida (sin `--coverage` en CI ni umbral).
5. **Restore drill** automatizado mensual (el backup actual, además, está roto — ver 4.2).

---

## 9. Tabla de Prioridades (impacto ÷ esfuerzo)

| # | Acción | Sev | Impacto | Esfuerzo | Tipo |
|---|---|---|---|---|---|
| 1 | `npm audit fix` + subir `react-router-dom` | C-8 | Alto | 5 min | **Quick win** |
| 2 | Migración `audit_log.action → VARCHAR(30)` + log en `audit.js` | C-2 | Alto | 30 min | **Quick win** |
| 3 | Eliminar/guardar `/api/debug/db-check` tras `NODE_ENV` check | C-3 | Alto | 5 min | **Quick win** |
| 4 | `app.all('*')` → `app.use()` en rama de emergencia | C-4 | Alto | 5 min | **Quick win** |
| 5 | `.max(12)` a `extraHours` + recalcular server-side desde `start/end` | C-1 | Muy alto | 2–4 h | **Quick win** |
| 6 | Ruta `/change-password` + NotFound `*` | C-5 | Alto | 15 min | **Quick win** |
| 7 | Exponer `isError` de queries en UI + banner | C-6 | Alto | 1–2 h | Quick win |
| 8 | `strict: true` + tipar las 6 mutaciones de `useApi.ts` | C-7 | Alto | 2–4 h | Quick win |
| 9 | Reemplazar backup/restore por `pg_dump`/`pg_restore` + cifrar con `sodium-native` + alerta de fallo | Alto | Muy alto | 4–6 h | Alto |
| 10 | Pool listener en `init()` + failover solo-lectura o eliminar fallback | Alto | Alto | 3–5 h | Alto |
| 11 | Login: dummy-hash, `timingSafeEqual`, log de errores de BD | Alto | Alto | 2 h | Alto |
| 12 | errorHandler: genérico en 5xx + redactar passwords de logs | Alto | Alto | 1 h | Quick win |
| 13 | CORS allowlist explícita + sin credentials | Alto | Alto | 30 min | Quick win |
| 14 | Des-duplicar: endpoint admin para crear usuarios sin token, modal persistente para password temporal | Alto | Alto | 3 h | Alto |
| 15 | CSP en vercel.json + quitar `unsafe-inline` | Alto | Alto | 2 h | Alto |
| 16 | `Sentry.init` (o quitar la dep) | Alto | Alto | 1 h | Quick win |
| 17 | Docker `USER node` + HEALTHCHECK; CI: `npm audit`, gitleaks, Dependabot, `permissions:` | Alto | Alto | 2 h | Alto |
| 18 | Índices `(user_id, date)` + queries por rango + `withTransaction()` + `ON CONFLICT` | Alto | Alto | 4 h | Alto |
| 19 | Tabla `tax_brackets` con vigencia mensual | Alto | Alto | 4 h | Alto |
| 20 | `strict` del logger (JSON), `QueryClient` defaults, arreglar clobbering de formularios | Medio | Medio | 3 h | Medio |

---

## 10. Roadmap de Mejora (Fase 17)

### 🔴 Sprint 0 — Crítico (1 semana, ~2 días-hombre)
Ítems 1–8 de la tabla anterior + `scripts/detect-anomalies.mjs` (import roto) + quitar `tempPassword` de logs/respuestas. **Criterio de salida:** ninguno de los 8 críticos reproducible; `npm audit` limpio; audit_log registra resets.

### 🟠 Sprint 1 — Alta prioridad (2–3 semanas)
Ítems 9–19: pg_dump, failover seguro, login endurecido, errorHandler/CORS/CSP, register-sin-token, Sentry, Docker+CI, índices+transacciones, tax_brackets. Añadir: tests de integración con supertest de los flujos auth + IDOR.

### 🟡 Sprint 2 — Media prioridad (1 mes)
Logger JSON estructurado, token_version/revocación, rate-limit distribuido (Upstash), refactor AppContext → React Query directo + strict frontend completo, a11y (htmlFor/dialogs/teclado), PWA (SW navigation fallback + banner de actualización), CSS fantasma + eliminar `App.css`, paginación server-side (eliminar `limit=100`), dynamic import de jsPDF, viáticos por nemonico + revisión de imponibilidad, TZ-safe dates.

### 🔵 Backlog — Baja prioridad
Migración backend JS→TS (43/46 archivos), valores legales parametrizados por UTM automático, LRU de payroll cache, uppercase de documentación, i18n si hay expansión, asistente IA, OCR, charts con virtualización, bcrypt cost 12, limpieza de docstrings.

---

## 11. Plan Maestro — Producto de Nivel Empresarial (Fase 19)

**Arquitectura objetivo:** la misma topología (Vercel + Neon) — es adecuada hasta ~10k usuarios activos — con service layer completa en backend, transacciones y caché encapsulados en services, BD con índices por `(user_id, date)` y `tax_brackets` versionados, FE con React Query como única fuente de estado servidor, observabilidad real (Sentry + logs JSON + uptime monitor) y CI con audit/SAST/secrets.

**Backlog técnico priorizado** = secciones 9–10 (28 ítems).
**Deuda técnica a quemar:** God-Context, JS/TS mixto, schemas/mappers muertos, doc-drift, `App.css`, 26 `any`.
**Cronograma:** Sprint 0 (sem 1) → Sprint 1 (sem 2–4) → Sprint 2 (mes 2) → Backlog continuo. **Esfuerzo total estimado: 15–20 días-hombre** para llegar a ~8.5/10 en las dimensiones evaluadas.
**Riesgos del plan:** (1) tocar payroll exige tests de regresión con casos reales — generar snapshot de liquidaciones actuales antes del Sprint 1; (2) cambio de backup requiere DRP drill antes de desactivar el dump propio; (3) el failover dual-DB debe desactivarse con ventana de mantenimiento coordinada con Neon.
**Dependencias:** `npm audit fix` no bloquea nada; `tax_brackets` requiere decisión del negocio sobre valores vigentes; paginación requiere decisión de UX de RecordsList.

---

## 12. Acciones Inmediatas (hacer hoy)

```bash
npm audit fix          # 5 vulns high, fix en rango semver
npm run test           # confirmar 34/34 tras el fix
```

```sql
-- migración 008
ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_records_user_date ON records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date);
```

1. `api/index.js:106` → envolver `/api/debug/db-check` en `if (process.env.NODE_ENV !== 'production')`.
2. `api/index.js:40` → `app.all('*')` → `app.use((_req, res) => res.status(500).json({...}))`.
3. `record.schema.js:14` → `z.number().min(0).max(12, 'Límite legal por día')`.
4. `App.tsx` → añadir `<Route path="/change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />` y `<Route path="*" element={<NotFound />} />`.
5. `AppContext.tsx` → exponer `payrollError` y renderizar banner de error en Dashboard/Simulator.
6. `audit.js:14` → reemplazar `catch {}` por `catch (e) { logger.error('audit insert failed', e); }`.

---

## 13. Conclusión Ejecutiva

El proyecto demuestra una madurez de ingeniería poco común para su tamaño — documentación, ADRs, tests del dominio monetario, higiene de secretos y defensa en profundidad — y su arquitectura serverless es correcta para la escala actual. No obstante, **cinco defectos verificados son inaceptables para un sistema que paga dinero**: el payroll puede falsificarse desde el cliente, la auditoría de cambios de contraseña se pierde silenciosamente, un endpoint de debug expone el esquema de producción, la app de emergencia no arranca, y el frontend muestra liquidaciones a $0 cuando falla la red sin avisar. Ninguno de estos problemas es costoso de corregir: el Sprint 0 propuesto (~2 días-hombre) elimina los ocho hallazgos críticos. Con el plan completo (15–20 días-hombre), el proyecto pasa de 6.5 a un nivel claramente empresarial. **Recomendación: ejecutar el Sprint 0 esta semana, antes de cualquier nueva funcionalidad.**

---

*Auditoría generada por revisión exhaustiva de los 77 archivos de código + verificación empírica (`npm audit`, `npm outdated`, `npm test`, `npm run lint`, `npm run typecheck`, `git ls-files`). Cada hallazgo fue verificado en el código fuente con archivo y línea exactos.*
