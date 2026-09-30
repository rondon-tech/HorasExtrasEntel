# Horas Extras Entel

Aplicación web full-stack para que técnicos de campo de **Entel Chile** registren horas extras, viáticos (bono gestión), días TAD/Contingencia y días libres, y obtengan automáticamente el cálculo de su **liquidación de sueldo** según la legislación laboral chilena (haberes imponibles, AFP/salud/cesantía, impuesto único de segunda categoría, bonos y descuentos).

## Características principales

### Dashboard
- **Líquido a Pagar**: monto del mes con mini-gráfico de tendencia (rango 3/6/12 meses), botón de privacidad 👁 (oculta los montos) y descarga/compartir de la liquidación en PDF.
- **Cartas mensuales clicables**, cada una con calendario visual y lista de detalle:
  - Horas Extras, Días Compens. Ganados, Días TAP Trabajados, Días Contingencia, Días Apoyo TAP, Viáticos del Mes, Días Libres y **Resumen del Mes** (vista combinada: TAP, vacaciones, compensatorios, jornada normal y días sin jornada).
- Los calendarios distinguen **días con tareas** (tono fuerte) de **disposiciones manuales** (tono claro, eliminables con confirmación).
- Selector de mes/año; todo el dashboard reacciona al período elegido.

### Registro diario y gastos
- **Registro Diario**: fecha, condición del día (Normal/TAD/TAD Apoyo), feriado, contingencia, sitio, tarea, horarios con cálculo automático de horas (soporta turnos nocturnos) y validación anti-duplicados por N° de tarea.
- **Módulo de Viáticos (Bono Gestión)**: nemónico con **texto libre + sugerencias**, lectura de tickets con IA (OCR extrae fecha y sugiere descripción) y valor automático por viático.
- **Días Libres**: planificador con calendario interactivo para marcar Vacaciones o Compensatorios por día, con guardado por lote y borrado con confirmación.

### Reporte / Liquidación
- **Liquidación Detallada**: haberes, descuentos legales y varios, composición de ingresos (gráfico), balance general y tendencia del líquido, exportable a PDF.

### Administración y cuentas
- Roles `user` y `global_admin`; panel admin (usuarios, reseteo de contraseñas, anomalías, uso de IA); cambio de contraseña obligatorio al primer ingreso; perfil editable.

### Agentes IA (opcionales, por cron)
- **A1**: enriquecimiento de anomalías cada 6 h; reporte mensual de liquidaciones; *restore drill* mensual que verifica que los backups son restaurables; diagnóstico ops; asistente conversacional; OCR de tickets.

### PWA y temas
- Service Worker, manifiesto instalable y tema oscuro/claro.

## Stack

| Capa            | Tecnología                                              |
| --------------- | ------------------------------------------------------- |
| Frontend        | React 19.3, TypeScript, Vite 8                          |
| Estado / datos  | React Context + TanStack React Query 5                  |
| Gráficos        | Recharts (reporte) + componentes propios (dashboard)    |
| Backend         | Node.js 22, Express 5                                   |
| Validación      | Zod 4                                                   |
| Base de datos   | PostgreSQL 16 (Neon.tech serverless) + migraciones      |
| Auth            | JWT (12 h) + bcrypt                                     |
| Backups         | `pg_dump` cifrado (AES-256-GCM) a Cloudflare R2         |
| Testing         | Vitest + Supertest                                      |
| Calidad         | Oxlint, `tsc`, `npm audit` como gate en CI              |
| Despliegue      | Vercel (frontend estático + API serverless)             |

> **Nota:** `react` y `react-dom` están pineados a la **misma versión exacta**: React 19 aborta el render con el error #527 si difieren aunque sea en un patch.

## Requisitos previos

- Node.js ≥ 22
- PostgreSQL local **o** cuenta en [Neon.tech](https://neon.tech)
- (Opcional, backups) bucket en Cloudflare R2 + `postgresql-client` (`pg_dump`/`pg_restore`)

## Configuración inicial

```bash
git clone https://github.com/rondon-tech/HorasExtrasEntel.git
cd horas-extras-app
npm install
cp .env.example .env   # completar con valores reales (nunca commitear .env)
npm run migrate         # aplica migraciones a DATABASE_URL
npm run dev             # frontend http://localhost:5173
npm run server          # backend  http://localhost:3001 (Vite proxea /api)
```

### Variables de entorno (resumen)

| Variable | Uso |
| -------- | --- |
| `DATABASE_URL` / `DATABASE_URL_FALLBACK` | PostgreSQL primaria y failover (`?sslmode=require`) |
| `JWT_SECRET` (≥ 32 car.) | Firma de tokens |
| `ADMIN_USER` / `ADMIN_PASSWORD` (≥ 12 car.) | Acceso administrador inicial |
| `FRONTEND_URL`, `NODE_ENV` | CORS y modo producción |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Backups |
| `BACKUP_ENCRYPTION_KEY` (64 hex) | Cifrado AES-256-GCM de backups. Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DRILL_DATABASE_URL`, `DRILL_CONFIRM_NOT_PRODUCTION=1` | BD efímera del restore drill |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, … | Agentes IA (ver `.env.example` para la cascada completa) |
| `SENTRY_DSN` | Observabilidad (opcional) |
| `PGSSLMODE=disable` | Solo desarrollo local sin TLS |

La lista completa y documentada está en [`.env.example`](./.env.example).

## Scripts disponibles

| Comando | Descripción |
| ------- | ----------- |
| `npm run dev` / `npm run server` | Frontend (HMR) / backend Express local |
| `npm run build` / `npm run preview` | Compilar (`tsc -b` + Vite) / previsualizar |
| `npm run lint` / `npm run typecheck` | Oxlint / `tsc` backend |
| `npm test` | Vitest (unitarios + integración de rutas Express) |
| `npm run migrate` / `migrate:down` | Migraciones `node-pg-migrate` |
| `npm run backup` / `npm run restore` | Backup cifrado a R2 / restore verificado (`RESTORE_TARGET=fallback\|primary`) |
| `npm run agents:enrich` | Enriquecimiento de anomalías (A1) |
| `npm run agents:report` | Reporte mensual de liquidaciones |
| `npm run agents:drill` | Restore drill contra BD efímera |
| `npm run eval:agents` | Evals anti-alucinación/anti-inyección (promptfoo) |
| `npm run agents:ops` | Diagnóstico ops (vía `POST /api/agent/ops/diagnosis`) |

## Estructura del proyecto

```
horas-extras-app/
├── api/index.js            # Bootstrap Express (CORS, rate-limit, routers, health, debug)
├── middleware.ts           # Rate-limit en el edge de Vercel (rutas /api/*)
├── server/
│   ├── agents/             # Sistema de agentes (chat, OCR, voz, anomalías, reportes, ops, memoria, presupuesto, telemetría)
│   ├── config/             # env (validado al arrancar), db, db-failover
│   ├── controllers/        # auth, records, expenses, params, payroll, admin
│   ├── middlewares/        # auth JWT, roles, cambio-password, validate (Zod), errorHandler
│   ├── migrations/         # Migraciones versionadas (up/down) node-pg-migrate
│   ├── repositories/       # Acceso a datos (SQL parametrizado, multi-tenant por user_id)
│   ├── routes/             # auth, records, expenses, params, admin, agent
│   ├── schemas/            # Schemas Zod por recurso
│   ├── services/           # payroll.service (cálculo), email.service
│   └── utils/              # logger, money, audit (audit_log)
├── src/
│   ├── api/client.ts       # Axios + JWT + manejo uniforme de errores
│   ├── components/         # BentoCard, modales (viáticos, días, calendario, días libres, resumen, confirmación…), AssistantPanel, guards
│   ├── constants/tasks.ts  # Tareas, sitios sugeridos, marcadores de días libres
│   ├── context/            # AuthContext (token, rol) y AppContext (datos + derivados del mes)
│   ├── hooks/              # useApi (React Query), usePayrollPDF, useHealthCheck
│   ├── screens/            # Dashboard, DailyRecord, Expenses, RecordsList, History, Simulator, Profile, AdminPanel, Login, Register, ChangePassword
│   └── utils/              # format (CLP/abreviado), fechas, PDFs (jsPDF)
├── scripts/
│   ├── backup.mjs / restore.mjs / restore-drill.mjs  # Backups v2 (ver abajo)
│   └── lib/backup-common.mjs  # R2 paginado, AES-256-GCM, SHA-256, pg_dump/pg_restore
├── evals/                  # Suites promptfoo para los agentes
├── docs/ (adr/, contexto/) # Decisiones de arquitectura y contexto del dominio
├── .github/workflows/      # CI, backups, restore, dr
...[truncated 3075 chars]