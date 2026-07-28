# INFORME DE AUDITORÍA TÉCNICA INTEGRAL

## Proyecto: Horas Extras Entel
## Fecha: 28 de Julio de 2026
## Equipo Auditor: Full Engineering Team (14 roles)

---

# 1. RESUMEN EJECUTIVO

**Horas Extras Entel** es una aplicación web full-stack diseñada para que técnicos de Entel Chile registren horas extras, viáticos, días TAD y contingencias, y calculen automáticamente su liquidación de sueldo según la legislación laboral chilena. La aplicación funciona como una PWA-like single-page app con React 19 + TypeScript + Vite 8 en el frontend y un backend Express 5 sobre Node.js con PostgreSQL (Neon.tech serverless) como base de datos, desplegado en Vercel.

**Calificación general: 5.2/10**

El proyecto cumple su función para el MVP actual, pero presenta vulnerabilidades de seguridad críticas, deuda técnica significativa, y carencias estructurales que lo hacen inadecuado para producción empresarial sin correcciones inmediatas. Los problemas más graves son la exposición de credenciales, secretos hardcodeados, y la arquitectura monolítica del backend.

---

# 2. FASE 1 — COMPRENSIÓN DEL PROYECTO

## 2.1 Objetivo del Sistema
Sistema de registro y cálculo de horas extras para técnicos de Entel Chile. Permite:
- Registrar jornadas diarias con horas extras, tipo de día (Normal, TAD, TAD Apoyo), contingencias y feriados
- Registrar viáticos (gastos de gestión)
- Calcular liquidación de sueldo según ley chilena (haberes imponibles, descuentos AFP/salud/cesantía, impuesto único, haberes exentos)
- Generar PDFs de reportes y liquidaciones
- Configurar parámetros salariales y previsionales

## 2.2 Usuarios Objetivo
- **Primario:** Técnicos de campo de Entel que registran sus horas extras diarias
- **Secundario:** Supervisores que auditan registros y revisan liquidaciones
- **Terciario:** Administradores que configuran parámetros del sistema

## 2.3 Tecnologías

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend Framework | React | 19.2.7 |
| Build Tool | Vite | 8.1.0 |
| Lenguaje Frontend | TypeScript | 6.0.2 |
| Backend Runtime | Node.js (Express) | 5.2.1 |
| Lenguaje Backend | JavaScript (ESM) | - |
| Base de Datos | PostgreSQL (Neon.tech) | Serverless |
| ORM/Cliente DB | pg (node-postgres) | 8.22.0 |
| Autenticación | JWT (jsonwebtoken) | 9.0.3 |
| Validación | Zod | 4.4.3 |
| Estado Frontend | React Context + TanStack Query | 5.101.2 |
| Logging | Winston | 3.19.0 |
| PDF | jsPDF + jspdf-autotable | 4.2.1 + 5.0.8 |
| Gráficos | Recharts | 3.9.0 |
| HTTP Client | Axios | 1.18.1 |
| Linting | Oxlint | 1.69.0 |
| Testing | Vitest | 4.1.9 |
| Despliegue | Vercel (serverless) | - |
| Fechas | date-fns | 4.4.0 |

## 2.4 Flujo de Información

```
Usuario → Login (JWT) → Dashboard → Registro Diario/Viáticos → API Express → PostgreSQL
                                                                    ↓
                                                            Cálculo Payroll ← Parámetros
                                                                    ↓
                                                          Simulador/Liquidación → PDF
```

---

# 3. FASE 2 — INVENTARIO COMPLETO

## 3.1 Estructura de Carpetas

```
horas-extras-app/
├── api/                          # Backend Express (JavaScript)
│   ├── index.js                  # [358 líneas] Servidor Express + todas las rutas + init DB
│   ├── middlewares/
│   │   ├── auth.js               # Middleware JWT (requireAuth)
│   │   ├── errorHandler.js       # Manejador global de errores
│   │   └── validate.js           # Middleware de validación Zod
│   ├── schemas/
│   │   ├── record.schema.js      # Esquema Zod para registros
│   │   ├── expense.schema.js     # Esquema Zod para viáticos
│   │   └── params.schema.js      # Esquema Zod para parámetros
│   ├── services/
│   │   ├── payroll.service.js    # Motor de cálculo de liquidación
│   │   └── payroll.service.test.js # Tests del motor de payroll
│   └── utils/
│       ├── logger.js             # Configuración Winston
│       ├── money.js              # Clase Money para aritmética de enteros
│       └── money.test.js         # Tests de la clase Money
├── src/                          # Frontend React + TypeScript
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Componente raíz con navegación por tabs
│   ├── App.css                   # Estilos heredados del template Vite
│   ├── index.css                 # Design system completo (401 líneas)
│   ├── api/
│   │   └── client.ts             # Cliente Axios con interceptors JWT
│   ├── assets/
│   │   ├── hero.png              # Imagen hero
│   │   ├── react.svg             # Logo React (template Vite)
│   │   └── vite.svg              # Logo Vite (template Vite)
│   ├── components/
│   │   └── QuickAddModal.tsx     # Modal para agregar días TAD/Contingencia
│   ├── context/
│   │   ├── AppContext.tsx         # Contexto global de la aplicación
│   │   └── AuthContext.tsx        # Contexto de autenticación
│   ├── screens/
│   │   ├── Dashboard.tsx         # Pantalla principal con KPIs
│   │   ├── DailyRecord.tsx       # Formulario de registro diario
│   │   ├── Expenses.tsx          # Formulario de viáticos
│   │   ├── History.tsx           # Configuración de parámetros
│   │   ├── Login.tsx             # Pantalla de login
│   │   ├── RecordsList.tsx       # Lista de registros con filtros avanzados
│   │   └── Simulator.tsx         # Simulador de liquidación detallada
│   └── utils/
│       ├── pdfGenerator.ts       # Generador PDF de reportes
│       └── payrollPdfGenerator.ts # Generador PDF de liquidaciones
├── public/                       # Assets públicos
│   ├── favicon.svg
│   └── icons.svg
├── logs/                         # Directorio de logs
├── .env                          # Variables de entorno (CRÍTICO: credenciales reales)
├── .gitignore
├── .oxlintrc.json                # Configuración Oxlint
├── index.html                    # HTML entry point
├── package.json
├── tsconfig.json                 # TypeScript root config
├── tsconfig.app.json             # TypeScript config frontend
├── tsconfig.node.json            # TypeScript config node
├── vercel.json                   # Config Vercel (rewrites)
└── vite.config.ts                # Config Vite + proxy
```

---

# 4. FASE 3 — ARQUITECTURA

## 4.1 Evaluación de Patrones Actuales

### Arquitectura Actual: Monolítica con Separación Débil

**Backend:** El archivo `api/index.js` (358 líneas) concentra:
- Inicialización de Express + CORS
- Conexión a base de datos
- Migración de esquema (CREATE TABLE IF NOT EXISTS)
- TODAS las rutas (records, expenses, params, payroll, login)
- Lógica de negocio de login
- Inicialización de la app

Esto viola gravemente el principio de **Single Responsibility (SOLID - S)** y **Separation of Concerns**.

**Frontend:** Mejor organizado con:
- Context API para estado global (AppContext + AuthContext)
- Componentes separados por pantalla
- Utilitarios separados para PDF

Pero carece de:
- Router declarativo (usa switch manual en App.tsx)
- Custom hooks para lógica reutilizable
- Capa de servicios/adaptadores para API calls

### Evaluación de Principios

| Principio | Cumplimiento | Observaciones |
|-----------|-------------|---------------|
| SOLID - S (Single Responsibility) | 3/10 | `api/index.js` hace demasiado. AppContext es enorme (262 líneas) |
| SOLID - O (Open/Closed) | 4/10 | No hay extensibilidad por plugins o strategy |
| SOLID - L (Liskov) | N/A | No hay herencia significativa |
| SOLID - I (Interface Segregation) | 5/10 | Interfaces definidas en AppContext pero muy acopladas |
| SOLID - D (Dependency Inversion) | 3/10 | El backend llama directamente a pg. El frontend acopla API calls en Context |
| DRY | 4/10 | `tareasOptions` duplicado en DailyRecord.tsx y Expenses.tsx |
| KISS | 7/10 | La complejidad es manejable para el tamaño actual |
| YAGNI | 8/10 | No hay sobreingeniería evidente |
| Separation of Concerns | 3/10 | Backend mezcla rutas, DB, migración y lógica |
| Clean Architecture | 2/10 | Sin capas claras, sin casos de uso, sin repositorios |
| DDD | 1/10 | Sin agregados, value objects, o bounded contexts |
| CQRS | 1/10 | Sin separación commands/queries |
| Event Driven | 1/10 | Sin eventos, sin message bus |

### Problemas de Acoplamiento Detectados

1. **Backend monolítico** (`api/index.js:1-358`): Todas las rutas, conexión DB y migración en un solo archivo
2. **Frontend AppContext** (`src/context/AppContext.tsx:1-262`): Mezcla estado, API calls, y cálculos. 262 líneas
3. **PDF generators** (`src/utils/pdfGenerator.ts`, `payrollPdfGenerator.ts`): Usan `any` para los parámetros, sin tipado estricto
4. **Duplicación de lógica PDF**: `Dashboard.tsx` y `Simulator.tsx` duplican `handleDownloadPDF` y `handleSharePDF`

### Arquitectura Ideal Propuesta

```
backend/
├── src/
│   ├── server.ts                 # Configuración Express
│   ├── config/
│   │   ├── database.ts           # Pool pg con validación
│   │   └── env.ts                # Validación de variables de entorno
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.routes.ts
│   │   ├── records/
│   │   │   ├── records.controller.ts
│   │   │   ├── records.service.ts
│   │   │   ├── records.repository.ts
│   │   │   └── records.routes.ts
│   │   ├── expenses/
│   │   │   └── ...
│   │   ├── params/
│   │   │   └── ...
│   │   └── payroll/
│   │       └── ...
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validate.ts
│   │   ├── rateLimiter.ts
│   │   └── errorHandler.ts
│   └── shared/
│       ├── types/
│       ├── utils/
│       └── errors/
├── migrations/                   # Migraciones versionadas
└── tests/

frontend/
├── src/
│   ├── app/
│   │   ├── providers/            # QueryClient, Auth, App providers
│   │   └── router.tsx            # React Router
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── useAuth.ts
│   │   ├── dashboard/
│   │   ├── records/
│   │   ├── expenses/
│   │   ├── payroll/
│   │   └── settings/
│   ├── shared/
│   │   ├── components/           # UI components reutilizables
│   │   ├── hooks/
│   │   ├── services/             # API service layer
│   │   ├── types/
│   │   └── utils/
│   └── styles/
```

---

# 5. FASE 4 — CALIDAD DEL CÓDIGO

## 5.1 Hallazgos

### A. Naming

| Problema | Archivo | Línea | Severidad |
|----------|---------|-------|-----------|
| `p` como nombre de variable | AppContext.tsx | 220 | Baja |
| `s` como nombre de variable en setState | AppContext.tsx | 146 | Baja |
| `e` en catch blocks | Múltiples | - | Baja |
| `doc as any` type assertion | pdfGenerator.ts | 69 | Media |
| Variables en español mezcladas con inglés | Múltiples | - | Baja |
| `nemónicos` nombre con tilde | Expenses.tsx | 41 | Baja |

### B. Funciones Largas

| Función | Archivo | Líneas | Severidad |
|---------|---------|--------|-----------|
| `calculatePayroll` | payroll.service.js | 88 | Media |
| `renderContent` (switch) | App.tsx | 16 | Media |
| `AppProvider` (JSX return) | AppContext.tsx | 111 | Alta |
| `handleSubmit` (DailyRecord) | DailyRecord.tsx | 44 | Media |

### C. Código Muerto / Sin Uso

| Elemento | Archivo |
|----------|---------|
| `App.css` - clases de template Vite no usadas (`.counter`, `.hero`, `#center`, `#next-steps`) | App.css |
| `react.svg`, `vite.svg`, `hero.png` - assets de template no usados en la app real | src/assets/ |
| `notes` property en DailyRecord interface - nunca se usa | AppContext.tsx:20 |
| `formattedMonth` en History.tsx - declarado pero no usado directamente en render | History.tsx:24 |

### D. Código Duplicado

| Fragmento | Ubicación 1 | Ubicación 2 |
|-----------|------------|-------------|
| `tareasOptions` array completo (20 entradas) | DailyRecord.tsx:5-26 | Expenses.tsx:5-26 |
| `formatCurrency` function | Dashboard.tsx:31-33 | Expenses.tsx:77-79 | Simulator.tsx:31-33 | RecordsList.tsx:84-86 |
| `handleDownloadPDF` + `handleSharePDF` | Dashboard.tsx:47-71 | Simulator.tsx:35-57 | RecordsList.tsx:93-120 |
| `extraHourRate` calculation | payroll.service.js:14 | AppContext.tsx:70 |
| `tareasOptions[0]` como valor sentinela para "sin selección" | DailyRecord.tsx:87 | Expenses.tsx:55 |

### E. Complejidad Ciclomática Alta

| Archivo | Función | Complejidad estimada |
|---------|---------|---------------------|
| payroll.service.js | calculatePayroll | 12+ (múltiples ifs, cálculos encadenados) |
| RecordsList.tsx | Filtrado encadenado (4 pasos) | 8+ |
| App.tsx | renderContent (switch con 7 casos) | 7 |

### F. Anti-Patrones

1. **Magic Numbers**: 120 (divisor de horas), 862822, 1917382, 3195637 (tramos de impuesto) en `payroll.service.js:14,63-68`
2. **Stringly Typed**: Los PDF generators reciben `any` como parámetro
3. **Sentinel Value Pattern**: Usa `tareasOptions[0]` como valor "no seleccionado" en lugar de un estado `null`
4. **God Component**: `AppContext.tsx` es demasiado grande y conoce demasiado
5. **Event Bus Casero**: `auth:unauthorized` custom event para comunicación entre módulos

---

# 6. FASE 5 — SEGURIDAD

## 6.1 Hallazgos Críticos

### 🔴 CRÍTICO #1: Credenciales de Base de Datos Expuestas

**Archivo:** `.env` línea 1
**Riesgo:** CRÍTICO

La URL de conexión a PostgreSQL de Neon.tech con usuario y contraseña está en texto plano:
```
DATABASE_URL="postgresql://neondb_owner:npg_ceHYFrKpWa01@ep-bold-credit-..."
```

Aunque `.env` está en `.gitignore`, el archivo existe en el filesystem y podría ser accedido mediante:
- Error de configuración del servidor
- Acceso al filesystem del deployment
- Commit accidental (ya ocurrió, ver git log para 57d53fb que menciona "Enterprise Architecture")

**Solución:**
1. **INMEDIATO:** Rotar la contraseña de la base de datos Neon.tech
2. Usar variables de entorno del sistema o secrets manager de Vercel
3. Eliminar el archivo `.env` del repositorio y filesystem local
4. Agregar `.env` a `.gitignore` sin espacios extra (actualmente tiene espacios al final)

### 🔴 CRÍTICO #2: JWT Secret Hardcodeado

**Archivos:** `api/index.js:52`, `api/middlewares/auth.js:13`
**Riesgo:** CRÍTICO

```javascript
const token = jwt.sign(..., process.env.JWT_SECRET || 'dev-secret-key-12345', ...);
const secret = process.env.JWT_SECRET || 'dev-secret-key-12345';
```

El fallback `'dev-secret-key-12345'` es un secreto débil y predecible. Si la variable de entorno no está configurada, el sistema usa este secreto trivial.

**Solución:**
1. **INMEDIATO:** Configurar `JWT_SECRET` como variable de entorno en Vercel con un valor fuerte (mínimo 256 bits)
2. Eliminar el fallback hardcodeado; lanzar error si la variable no existe
3. Usar `crypto.randomBytes(64).toString('hex')` para generar un secreto fuerte

### 🔴 CRÍTICO #3: Credenciales de Admin por Defecto Hardcodeadas

**Archivos:** `api/index.js:48-49`
**Riesgo:** CRÍTICO

```javascript
const validUser = process.env.ADMIN_USER || 'admin';
const validPass = process.env.ADMIN_PASSWORD || 'password123';
```

Cualquiera que descubra estas credenciales (o si no se configuran variables de entorno) puede acceder al sistema.

**Solución:**
1. **INMEDIATO:** Configurar `ADMIN_USER` y `ADMIN_PASSWORD` como variables de entorno
2. Implementar hashing de contraseñas (bcrypt/argon2) y almacenamiento en base de datos
3. Agregar rate limiting en el endpoint de login
4. Implementar bloqueo de cuenta tras N intentos fallidos

### 🔴 CRÍTICO #4: SSL sin Verificación de Certificado

**Archivo:** `api/index.js:63-65`
**Riesgo:** ALTO

```javascript
ssl: {
  rejectUnauthorized: false
}
```

Esto deshabilita la verificación del certificado SSL, permitiendo ataques Man-in-the-Middle. Cualquier atacante que pueda interceptar el tráfico puede leer/modificar los datos entre la app y Neon.tech.

**Solución:**
1. **INMEDIATO:** Eliminar `rejectUnauthorized: false` o configurarlo solo para desarrollo
2. En producción, Neon.tech proporciona certificados válidos; no se necesita esta opción
3. Si es necesario para entornos locales, condicionar con `NODE_ENV !== 'production'`

### 🟠 ALTO #5: Token JWT en localStorage

**Archivo:** `src/api/client.ts:11`, `src/context/AuthContext.tsx:13`
**Riesgo:** ALTO

El token JWT se almacena en `localStorage`, lo que lo hace vulnerable a XSS. Cualquier script malicioso inyectado puede leer el token.

**Solución:**
1. Usar cookies HttpOnly + Secure para almacenar el token
2. Implementar Content Security Policy (CSP) para prevenir XSS
3. Si se mantiene localStorage, implementar token refresh con rotación
4. Usar tiempos de expiración cortos (actualmente 12h)

### 🟠 ALTO #6: Sin Rate Limiting en Login

**Archivo:** `api/index.js:45-56`
**Riesgo:** ALTO

El endpoint `/api/login` no tiene rate limiting, permitiendo ataques de fuerza bruta.

**Solución:**
1. Implementar `express-rate-limit`
2. Configurar máximo 5 intentos por IP en 15 minutos
3. Agregar retraso exponencial en intentos fallidos

### 🟠 ALTO #7: Sin Sanitización de Inputs

**Riesgo:** ALTO

Aunque Zod valida tipos y formatos, no hay sanitización contra contenido malicioso (XSS en campos de texto como `sitio`, `tarea`, `description`).

**Solución:**
1. Usar librerías como `xss` o `DOMPurify` para sanitizar inputs de texto
2. Escapar outputs en el frontend (React lo hace por defecto con JSX, pero tener cuidado con `dangerouslySetInnerHTML`)

### 🟡 MEDIO #8: Sin Headers de Seguridad HTTP

**Riesgo:** MEDIO

No se configuran headers de seguridad como:
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Strict-Transport-Security`
- `X-XSS-Protection`

**Solución:** Instalar e implementar `helmet`

### 🟡 MEDIO #9: CORS Demasiado Permisivo

**Archivo:** `api/index.js:20-34`
**Riesgo:** MEDIO

La lógica permite cualquier subdominio de `vercel.app` (`origin.endsWith('.vercel.app')`), lo que incluye deployments de preview de cualquier usuario de Vercel.

**Solución:**
1. Restringir a dominios específicos en lugar de wildcards
2. Usar `FRONTEND_URL` como variable de entorno para producción
3. Enumerar explícitamente los dominios permitidos

### 🟢 BAJO #10: Datos Sensibles en Logs

No se detectó logging de datos sensibles, pero no hay una política explícita.

### 🟢 BAJO #11: Sin Doble Factor de Autenticación

No hay MFA para el acceso. Dado que es una app de uso interno, podría ser aceptable en MVP.

---

# 7. FASE 6 — RENDIMIENTO

## 7.1 Hallazgos

### 🟠 ALTO #1: Cálculo de Payroll sin Caché
**Archivo:** `api/services/payroll.service.js`
Cada vez que se consulta `/api/payroll/:year/:month`, se ejecutan 3 queries separadas y se recalcula todo el payroll. No hay caché de los resultados ni de los parámetros.

**Impacto:** Con muchos registros, el cálculo puede ser costoso
**Solución:** Cachear el resultado del payroll por mes (invalidar cuando cambian registros/expenses/params)

### 🟡 MEDIO #2: Fetch de Todos los Registros sin Paginación
**Archivo:** `api/index.js:236`
`SELECT * FROM records ORDER BY date DESC` — retorna TODOS los registros sin límite ni paginación.

**Impacto:** Con 10,000+ registros, el tiempo de respuesta y memoria se degradan
**Solución:** Implementar paginación con `LIMIT` y `OFFSET`, o cursor-based pagination

### 🟡 MEDIO #3: 4 Llamadas API en Paralelo al Iniciar
**Archivo:** `src/context/AppContext.tsx:139-144`
Al cargar, se hacen 4 llamadas API simultáneas (params, records, expenses, payroll). Si alguna falla, no hay reintentos.

**Solución:** Usar React Query con staleTime, retry, y suspense

### 🟡 MEDIO #4: División con Punto Flotante en Cálculo de Hora Extra
**Archivo:** `api/services/payroll.service.js:14`
```javascript
const extraHourRate = baseParaHorasExtras.amount / 120;
```
Aunque el resto usa `Money` (enteros), esta línea usa división de punto flotante.

**Solución:** Usar aritmética de enteros consistente: `Math.round(baseParaHorasExtras.amount / 120)`

### 🟢 BAJO #5: Re-renderizado de Dashboard
El Dashboard se re-renderiza al cambiar `currentMonth`, lo que dispara 4 llamadas API. React Query mitigaría esto.

### 🟢 BAJO #6: Selectores de Mes/Año con Arrays Hardcodeados
**Archivo:** `Dashboard.tsx:83`
Años hardcodeados: `[2024, 2025, 2026, 2027]`. En 2028 dejará de funcionar.

**Solución:** Generar dinámicamente desde el año actual ± N años

---

# 8. FASE 7 — BASE DE DATOS

## 8.1 Evaluación del Esquema

### Tablas Actuales

**`records`** — Registros de horas extras
| Columna | Tipo | Observación |
|---------|------|-------------|
| id | UUID PK | OK |
| date | DATE | Sin índice para búsquedas por mes |
| day_type | VARCHAR(50) | Debería ser ENUM o tabla de referencia |
| is_feriado | BOOLEAN | OK |
| is_contingencia | BOOLEAN | OK |
| start_time | TIME | OK |
| end_time | TIME | OK |
| sitio | VARCHAR(255) | OK |
| tarea | VARCHAR(255) | OK |
| extra_hours | NUMERIC(10,2) | Podría ser calculado, no almacenado |
| created_at | TIMESTAMP | OK |

**`expenses`** — Viáticos
| Columna | Tipo | Observación |
|---------|------|-------------|
| id | UUID PK | OK |
| date | DATE | Sin índice |
| nemonico | VARCHAR(50) | OK |
| description | VARCHAR(255) | OK |
| created_at | TIMESTAMP | OK |

**`params`** — Parámetros de cálculo
| Columna | Tipo | Observación |
|---------|------|-------------|
| id | INTEGER PK DEFAULT 1 | Single-row table, diseño cuestionable |
| 17 columnas numéricas | | Sin versionado histórico |

### Problemas Identificados

#### 🟠 ALTO #1: Migraciones Inline sin Versionado
**Archivo:** `api/index.js:74-137`

La creación de tablas y ALTER TABLE se ejecuta en cada inicio de la app. Esto es frágil y no escalable:
- Si un ALTER falla, puede dejar la base de datos en estado inconsistente
- No hay control de versiones de esquema
- No hay rollback
- Mezcla DDL con DML (INSERT del param default)

**Solución:** Implementar un sistema de migraciones (Knex, Prisma, node-pg-migrate)

#### 🟡 MEDIO #2: Sin Índices para Búsquedas Comunes
```sql
-- Las queries más frecuentes NO tienen índices:
SELECT * FROM records WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
SELECT * FROM expenses WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
```

`EXTRACT(YEAR FROM date)` no puede usar un índice estándar.

**Solución:**
1. Agregar columnas `year` y `month` generadas o virtuales con índice compuesto
2. O usar un índice sobre `date` con range queries: `date >= '2026-07-01' AND date < '2026-08-01'`

#### 🟡 MEDIO #3: Tabla `params` como Single-Row
El diseño de una sola fila (id=1) para parámetros no permite:
- Historial de cambios
- Auditoría de quién cambió qué y cuándo
- Múltiples perfiles de parámetros

**Solución:**
1. Agregar `updated_at` y `updated_by`
2. Crear tabla `params_history` para auditoría
3. O usar un diseño con `effective_date` para valores históricos

#### 🟢 BAJO #4: `extra_hours` Almacenado y Calculado
La columna `extra_hours` se almacena pero también se podría calcular de `end_time - start_time`. Esto crea riesgo de inconsistencia. Sin embargo, es aceptable para el caso de uso donde las horas pueden no coincidir exactamente con el tiempo trabajado.

#### 🟢 BAJO #5: Sin Constraints de Integridad
- No hay FOREIGN KEY entre `records`/`expenses` y una tabla de usuarios
- No hay CHECK constraints para valores (ej: `extra_hours >= 0`)
- `day_type` debería tener un CHECK IN ('Normal', 'TAD', 'TAD Apoyo')

---

# 9. FASE 8 — FRONTEND

## 9.1 Evaluación

### Fortalezas
1. **Design system CSS** (`index.css`): Sistema de variables CSS bien estructurado con temas dark/light
2. **Componentes con estado local apropiado**: Cada pantalla maneja su propio estado de formulario
3. **Experiencia mobile-first**: Layout de 600px máximo simula app nativa
4. **Navegación por tabs consistente**: Bottom nav intuitiva
5. **Filtros avanzados en RecordsList**: Búsqueda, filtros por categoría, rango de fechas, ordenamiento
6. **Gráficos interactivos**: Recharts para visualización de datos
7. **Exportación PDF y Web Share API**: Funcionalidad nativa de compartir

### Debilidades

#### 🟠 ALTO #1: Sin Router Declarativo
**Archivo:** `App.tsx:44-65`

La navegación se hace con un switch manual y `useState('dashboard')`. Esto impide:
- Deep linking (URLs compartibles como `/simulator/2026/7`)
- Navegación del navegador (atrás/adelante)
- Bookmarks

**Solución:** Implementar React Router con rutas como:
```
/ -> Dashboard
/record -> DailyRecord
/records -> RecordsList
/simulator -> Simulator
/settings -> History
```

#### 🟡 MEDIO #2: AppContext Demasiado Grande
**Archivo:** `src/context/AppContext.tsx` (262 líneas)

El contexto mezcla:
- Estado de la aplicación
- Llamadas API
- Tipos de datos
- Valores computados

**Solución:** Separar en:
- `RecordService`, `ExpenseService`, `ParamsService` (hooks de React Query)
- `usePayrollCalculation` (hook derivado)
- Mantener solo estado UI en Context

#### 🟡 MEDIO #3: Inline Styles Excesivos
Múltiples componentes usan `style={{...}}` en lugar de clases CSS. Esto:
- Dificulta el mantenimiento
- Impide la consistencia visual
- No aprovecha el design system de `index.css`

**Ejemplos:** App.tsx:70-89 (header buttons), DailyRecord.tsx:154-162 (checkboxes), QuickAddModal.tsx:60-65 (modal overlay)

#### 🟡 MEDIO #4: Sin Estados de Carga
No hay indicadores de carga visual (skeletons, spinners) durante las llamadas API. El usuario ve datos en cero hasta que se cargan.

#### 🟡 MEDIO #5: Uso de `alert()` para Feedback
Múltiples lugares usan `alert()` nativo para notificar al usuario:
- `DailyRecord.tsx:88,94,114,118`
- `Expenses.tsx:56,68,72`
- `History.tsx:21`

**Solución:** Implementar un sistema de toast notifications

#### 🟢 BAJO #6: `tareasOptions` Duplicado
**Archivos:** `DailyRecord.tsx:5-26`, `Expenses.tsx:5-26`

El mismo array de 20 tareas está duplicado en dos archivos.

**Solución:** Extraer a `src/constants/tasks.ts`

#### 🟢 BAJO #7: Sin Error Boundaries
No hay `ErrorBoundary` components. Si un error ocurre en una pantalla, toda la app crashea.

#### 🟢 BAJO #8: Sin Accesibilidad
- No hay atributos `aria-*`
- No hay roles semánticos en componentes interactivos
- Los botones del modal no son accesibles por teclado
- No hay focus management

---

# 10. FASE 9 — BACKEND

## 10.1 Evaluación

### Fortalezas
1. **Validación con Zod**: Buen uso de schemas tipados para validar inputs
2. **Manejo de errores centralizado**: `errorHandler` middleware consistente
3. **Logging con Winston**: Buena configuración para serverless vs tradicional
4. **JWT con middleware reusable**: `requireAuth` correctamente implementado
5. **Separación de schemas**: Zod schemas en archivos independientes
6. **Clase Money para precisión financiera**: Buena práctica evitar floats

### Debilidades

#### 🟠 ALTO #1: Backend Monolítico
**Archivo:** `api/index.js` (358 líneas)

Todas las rutas, configuración, DB init y lógica de negocio en un solo archivo.

**Solución:** Refactorizar a estructura modular (ver sección Arquitectura Ideal)

#### 🟠 ALTO #2: Backend en JavaScript (no TypeScript)
Todo el backend está en JavaScript plano. Siendo que el frontend sí usa TypeScript, esta inconsistencia genera:
- Sin type safety en el backend
- Sin interfaces compartidas entre frontend y backend
- Mayor riesgo de errores en runtime

**Solución:** Migrar el backend a TypeScript progresivamente

#### 🟡 MEDIO #3: Sin DTOs / Capa de Presentación
La respuesta de `/api/records` mapea manualmente snake_case a camelCase (`api/index.js:237-249`). Esta lógica está repetida en cada endpoint.

**Solución:** Crear funciones `toRecordDTO(row)`, `toExpenseDTO(row)`, `toParamsDTO(row)` reutilizables

#### 🟡 MEDIO #4: Sin Timeouts de Request
No hay timeouts configurados en Express ni en las queries de PostgreSQL. Una query lenta puede bloquear el event loop.

**Solución:**
1. Configurar `pool.query` con `statement_timeout`
2. Configurar timeout de 30s en Express con `req.setTimeout()`

#### 🟡 MEDIO #5: Sin Límite de Tamaño de Request Body
`express.json()` no tiene límite explícito. Por defecto es 100kb, pero debería ser explícito.

**Solución:** `app.use(express.json({ limit: '1mb' }))`

#### 🟢 BAJO #6: Sin Health Check Endpoint
No hay un endpoint `/api/health` que verifique la conexión a la base de datos.

#### 🟢 BAJO #7: Sin Graceful Shutdown
El servidor no maneja señales SIGTERM/SIGINT para cerrar conexiones de DB.

#### 🟢 BAJO #8: Sin Transaction Support
Las operaciones que requieren atomicidad (ej: crear record + actualizar params) no usan transacciones.

---

# 11. FASE 10 — TESTING

## 11.1 Evaluación

### Cobertura Actual: ~5%

| Tipo de Test | Cantidad | Archivos |
|-------------|----------|----------|
| Backend unit | 2 suites | `money.test.js`, `payroll.service.test.js` |
| Frontend unit | 0 | - |
| Integración | 0 | - |
| E2E | 0 | - |

### Tests Existentes - Calidad

**`money.test.js`** (4 tests): Buenos tests unitarios para la clase Money. Prueban add, subtract, multiply y division. Correctos pero limitados (no prueban casos edge como números negativos o cero).

**`payroll.service.test.js`** (3 tests): Prueban el motor de cálculo con casos representativos. Buenos tests pero limitados:
- No prueban el cálculo de impuestos (el test del caso base no tiene impuestos)
- No prueban edge cases (sin records, sin params, valores extremos)
- No prueban la función de tramos de impuesto (el sueldo es menor al primer tramo)

### Tests Faltantes (Priorizados)

#### Críticos
- [ ] **Auth API tests**: Login con credenciales válidas, inválidas, token expirado
- [ ] **Records CRUD tests**: Crear, leer, actualizar, eliminar registros
- [ ] **Expenses CRUD tests**: Crear, leer, actualizar, eliminar viáticos
- [ ] **Params API tests**: GET y PUT de parámetros

#### Alta Prioridad
- [ ] **Payroll service completo**: Todos los tramos de impuesto, valores negativos, sin datos
- [ ] **API Integration tests**: Flujos completos (login → crear registro → calcular payroll)
- [ ] **Auth middleware tests**: Sin token, token inválido, token expirado
- [ ] **Validation middleware tests**: Schemas válidos e inválidos

#### Media Prioridad
- [ ] **Frontend component tests**: Login, Dashboard, DailyRecord
- [ ] **PDF generation tests**: Verificar estructura de PDFs generados
- [ ] **Error handling tests**: Database down, timeout, etc.

#### Baja Prioridad
- [ ] **E2E tests**: Flujo completo de usuario con Playwright/Cypress
- [ ] **Performance tests**: Carga con 1000+ registros
- [ ] **Accessibility tests**: axe-core

---

# 12. FASE 11 — DEVOPS

## 12.1 Evaluación

### Situación Actual

| Componente | Estado |
|-----------|--------|
| Docker | ❌ No implementado |
| Docker Compose | ❌ No implementado |
| CI/CD | ❌ No implementado |
| GitHub Actions | ❌ No implementado |
| Variables de entorno | ⚠️ `.env` local, sin validación |
| Observabilidad | ⚠️ Solo Winston logs |
| Monitoreo | ❌ No implementado |
| Backups | ❌ No implementado (Neon.tech provee backups automáticos limitados) |
| Health checks | ❌ No implementado |
| Versionado semántico | ❌ `"version": "0.0.0"` |

### Recomendaciones

#### 🟠 ALTO #1: Sin CI/CD
Sin pipeline de integración continua, no hay:
- Verificación automática de tests
- Linting automático
- Build verification
- Deploy automático

**Solución (GitHub Actions):**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

#### 🟠 ALTO #2: Sin Docker
No hay containerización, lo que dificulta:
- Consistencia entre entornos
- Onboarding de desarrolladores
- Despliegues reproducibles

**Solución:** Crear `Dockerfile` y `docker-compose.yml`

#### 🟡 MEDIO #3: Sin Validación de Variables de Entorno
La app asume que las variables de entorno existen y usa fallbacks inseguros.

**Solución:** Agregar validación al inicio:
```javascript
const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}
```

#### 🟡 MEDIO #4: Sin Estrategia de Backups
Los datos de payroll son críticos. Neon.tech ofrece point-in-time recovery pero no hay política explícita de backups.

**Solución:** Configurar pg_dump periódico o usar Neon.tech branching como backup.

#### 🟢 BAJO #5: Sin Monitoreo de Errores
No hay integración con Sentry, Datadog, o similar para tracking de errores en producción.

---

# 13. FASE 12 — DEPENDENCIAS

## 13.1 Análisis de Librerías

### Dependencias de Producción

| Librería | Versión | Vigencia | Riesgos | Alternativas |
|----------|---------|----------|---------|-------------|
| **react** | 19.2.7 | ✅ Vigente | - | - |
| **react-dom** | 19.2.7 | ✅ Vigente | - | - |
| **@tanstack/react-query** | 5.101.2 | ✅ Vigente | - | SWR |
| **express** | 5.2.1 | ✅ Vigente | Express 5 es relativamente nuevo; algunos middleware pueden no ser compatibles | Fastify |
| **pg** | 8.22.0 | ✅ Vigente | - | - |
| **axios** | 1.18.1 | ✅ Vigente | - | fetch nativo |
| **jsonwebtoken** | 9.0.3 | ⚠️ Mantenimiento bajo | Última release: 2024. Sin actualizaciones frecuentes | jose |
| **zod** | 4.4.3 | ✅ Vigente | Zod 4 es muy nuevo; puede tener bugs | valibot (más ligero) |
| **date-fns** | 4.4.0 | ✅ Vigente | - | dayjs |
| **winston** | 3.19.0 | ✅ Vigente | Pesado para serverless | pino |
| **cors** | 2.8.6 | ⚠️ Sin cambios desde 2018 | Funciona pero sin mantenimiento activo | Middleware manual |
| **dotenv** | 17.4.2 | ✅ Vigente | - | Node 20+ nativo |
| **jspdf** | 4.2.1 | ✅ Vigente | Pesado (~500KB) | @react-pdf/renderer |
| **jspdf-autotable** | 5.0.8 | ✅ Vigente | - | - |
| **lucide-react** | 1.22.0 | ✅ Vigente | - | - |
| **recharts** | 3.9.0 | ✅ Vigente | Renderizado pesado con muchos datos | Nivo, visx |

### Dependencias de Desarrollo

| Librería | Versión | Vigencia | Riesgos |
|----------|---------|----------|---------|
| **typescript** | 6.0.2 | ✅ Vigente | TS 6 es bleeding edge; riesgo de bugs |
| **vite** | 8.1.0 | ✅ Vigente | Vite 8 es bleeding edge |
| **vitest** | 4.1.9 | ✅ Vigente | - |
| **oxlint** | 1.69.0 | ✅ Vigente | Alternativa rápida a ESLint |
| **@vitejs/plugin-react** | 6.0.2 | ✅ Vigente | - |
| **@types/react** | 19.2.17 | ✅ Vigente | - |
| **@types/react-dom** | 19.2.3 | ✅ Vigente | - |
| **@types/node** | 24.13.2 | ✅ Vigente | - |

### Recomendaciones de Dependencias

1. **Reemplazar `jsonwebtoken` por `jose`**: `jose` es más moderno, soporta Edge runtimes, y tiene mejor mantenimiento
2. **Reemplazar `cors` por configuración manual**: Reducir dependencia para algo trivial
3. **Reemplazar `winston` por `pino`**: Más ligero y rápido, mejor para serverless
4. **Evaluar `zod` 4 vs 3**: Zod 4 es muy nuevo; considerar estabilidad para producción
5. **Agregar `helmet`**: Para headers de seguridad HTTP
6. **Agregar `express-rate-limit`**: Para rate limiting
7. **Agregar `bcrypt` o `argon2`**: Para hashing de contraseñas

---

# 14. FASE 13 — EXPERIENCIA DE USUARIO

## 14.1 Hallazgos

### Fortalezas UX
1. Diseño oscuro moderno con paleta Entel
2. Navegación inferior tipo app móvil
3. Cambio de tema dark/light
4. KPIs visibles en Dashboard
5. Selectores de fecha con mes/año intuitivos
6. Filtros avanzados con pills en RecordsList
7. Modal rápido para días TAD/Contingencia

### Debilidades UX

| Problema | Impacto | Solución |
|----------|---------|----------|
| `alert()` para cada acción exitosa | Interrumpe el flujo constantemente | Sistema de toasts no invasivos |
| Sin confirmación al navegar sin guardar | Pérdida de datos en formularios | `beforeunload` o prompt |
| Sin indicadores de carga | Usuario no sabe si algo está pasando | Skeletons/spinners |
| Sin atajos de teclado | Lentitud en uso frecuente | Shortcuts (Ctrl+N nuevo registro, etc.) |
| Select de tarea con opción "placeholder" | Confuso; se puede enviar sin seleccionar | Usar placeholder real del select o valor inicial null |
| Tareas y viáticos no sugieren valores previos | Re-tipeo constante de sitios/nemónicos | Autocomplete con valores frecuentes |
| Navegación no refleja la URL | No se puede compartir una vista específica | React Router |
| Tab "Ajustes" llamada "History" en el código | Confusión semántica | Renombrar consistente |
| Sin onboarding/tutorial | Nuevo usuario no sabe por dónde empezar | Tooltips o walkthrough inicial |
| Selectores de meses manuales (sin datepicker) | Incómodo para seleccionar fecha | Datepicker con calendario |

---

# 15. FASE 14 — ESCALABILIDAD

## 15.1 Análisis por Volumen

### 100 Usuarios
✅ **Funciona sin problemas.** La arquitectura actual con Neon.tech serverless y Vercel soporta este volumen sin modificaciones.

### 1,000 Usuarios
⚠️ **Riesgos moderados:**
- Sin paginación en `/api/records`, el payload crece linealmente
- Sin caché de payroll, cada usuario recalcula
- Conexiones a PostgreSQL: Neon.tech serverless escala automáticamente, pero el pool size debe configurarse

### 10,000 Usuarios
🔴 **Problemas significativos:**
- `SELECT * FROM records` sin límite se vuelve inviable
- El cálculo de payroll en memoria se vuelve costoso
- Sin índices en columnas de fecha, las queries por mes se degradan
- localStorage para token: vulnerable y limitado

### 100,000 Usuarios
🔴 **No viable sin refactorización mayor:**
- Se requiere sharding o particionamiento de tablas
- Se requiere cola de trabajos para cálculos asíncronos
- Se requiere CDN para assets estáticos
- Se requiere autenticación distribuida (Redis para sesiones)

### 1 Millón de Registros
🔴 **No viable sin optimización:**
- Índices compuestos en (year, month) o particionamiento por mes
- Paginación obligatoria en todas las queries
- Cálculo de payroll debe ser asíncrono con cache
- Limpieza/archivado de registros antiguos

### 10 Millones de Registros
🔴 **Requiere re-arquitectura:**
- Base de datos columnar o time-series para analytics
- Separación de reads/writes (CQRS)
- Event sourcing para auditoría
- Data warehouse para reportes históricos

---

# 16. FASE 15 — INTELIGENCIA ARTIFICIAL

## 16.1 Oportunidades de IA

| Oportunidad | Beneficio | Complejidad | Costo | Prioridad |
|------------|-----------|-------------|-------|-----------|
| **Detección de anomalías en horas extras** | Identificar registros sospechosos (horas excesivas, patrones inusuales) | Media | Bajo (modelo estadístico) | Alta |
| **Predicción de liquidación mensual** | Anticipar el sueldo esperado basado en tendencias históricas | Media | Bajo (regresión simple) | Media |
| **Clasificación automática de tareas** | Sugerir tipo de tarea basado en sitio y día | Media | Bajo | Media |
| **OCR de boletas de viáticos** | Escanear boletas físicas para autocompletar gastos | Alta | Medio (API de visión) | Baja |
| **Asistente conversacional** | Responder dudas sobre cálculo de sueldo, normativa, etc. | Alta | Medio (RAG + LLM) | Baja |
| **Reportes ejecutivos automáticos** | Generar resúmenes narrativos del mes con IA generativa | Media | Bajo (LLM local) | Media |
| **Optimización de parámetros** | Sugerir ajustes de parámetros basados en datos históricos | Alta | Bajo | Baja |

---

# 17. FASE 16 — REFACTORIZACIONES PRIORIZADAS

| # | Refactorización | Problema | Solución | Beneficio | Dificultad | Prioridad |
|---|----------------|----------|----------|-----------|------------|-----------|
| 1 | Extraer secretos hardcodeados | Seguridad crítica | Variables de entorno con validación | Seguridad | Baja | **Crítica** |
| 2 | Implementar rate limiting | Fuerza bruta sin límite | express-rate-limit en /api/login | Seguridad | Baja | **Crítica** |
| 3 | Arreglar SSL verification | MITM posible | Quitar rejectUnauthorized: false | Seguridad | Baja | **Crítica** |
| 4 | Modularizar backend | Monolito 358 líneas | Routes, controllers, services separados | Mantenibilidad | Alta | Alta |
| 5 | Migrar backend a TypeScript | Sin type safety | Convertir .js a .ts progresivamente | Calidad | Alta | Alta |
| 6 | Implementar React Router | Sin deep linking | Migrar navegación por tabs a rutas | UX | Media | Alta |
| 7 | Separar AppContext | Contexto gigante | React Query + custom hooks | Mantenibilidad | Media | Alta |
| 8 | Eliminar `tareasOptions` duplicado | DRY violation | Extraer a constants/tasks.ts | Mantenibilidad | Baja | Alta |
| 9 | Extraer `formatCurrency` | 4 copias idénticas | Crear utils/format.ts | Mantenibilidad | Baja | Alta |
| 10 | Sistema de toast notifications | alert() invasivo | Implementar react-hot-toast | UX | Media | Media |
| 11 | Agregar índices de base de datos | Queries lentas sin índices | Índices en (date), (year, month) | Rendimiento | Media | Media |
| 12 | Implementar paginación | Carga completa de registros | LIMIT/OFFSET en API | Escalabilidad | Media | Media |
| 13 | Sistema de migraciones | DDL en código | Knex o node-pg-migrate | Confiabilidad | Media | Media |
| 14 | Agregar Error Boundaries | Crash total de la app | ErrorBoundary components | UX | Baja | Media |
| 15 | Configurar Helmet.js | Sin headers de seguridad | helmet middleware | Seguridad | Baja | Media |
| 16 | Token en HttpOnly cookies | XSS vulnerable | Cookie-based auth | Seguridad | Media | Baja |
| 17 | Dockerizar | Sin consistencia de entornos | Dockerfile + docker-compose | DevOps | Media | Baja |
| 18 | CI/CD pipeline | Sin verificación automática | GitHub Actions | DevOps | Media | Baja |
| 19 | Mejorar accesibilidad | Sin ARIA/semántica | Atributos aria, roles, focus | Accesibilidad | Alta | Baja |
| 20 | Implementar tests de integración | Sin cobertura real | Supertest + MSW | Calidad | Alta | Baja |

---

# 18. FASE 17 — ROADMAP

## CRÍTICO (Corregir Inmediatamente - Semana 1)

1. **Rotar credenciales de base de datos Neon.tech**
   - La contraseña actual está expuesta en `.env`
   - Configurar variables de entorno en Vercel
   - Eliminar `.env` del filesystem (ya está en gitignore)

2. **Configurar JWT_SECRET fuerte en Vercel**
   - Eliminar fallback `'dev-secret-key-12345'`
   - Generar secreto de 256+ bits
   - Agregar validación al iniciar

3. **Configurar ADMIN_USER y ADMIN_PASSWORD en Vercel**
   - Eliminar fallbacks `'admin'` y `'password123'`
   - Implementar bcrypt para hash de contraseña

4. **Eliminar `rejectUnauthorized: false` en producción**
   - Condicionar a `NODE_ENV !== 'production'`

5. **Agregar rate limiting en `/api/login`**
   - Instalar express-rate-limit
   - 5 intentos por IP cada 15 minutos

6. **Configurar Helmet.js para headers de seguridad**
   - CSP, X-Frame-Options, HSTS, etc.

## ALTA PRIORIDAD (Semanas 2-4)

7. **Refactorizar backend a estructura modular**
   - Separar routes, controllers, services
   - Mover DB init a módulo independiente

8. **Implementar React Router**
   - Rutas declarativas
   - Deep linking y navegación del navegador

9. **Migrar backend a TypeScript**
   - Comenzar con tipos compartidos
   - Migrar archivo por archivo

10. **Separar AppContext en servicios React Query**
    - `useRecords`, `useExpenses`, `useParams`, `usePayroll`
    - Eliminar estado local redundante

11. **Agregar índices de base de datos**
    - Índice compuesto en records(date) o (year, month)
    - Cambiar queries a usar range en lugar de EXTRACT

## MEDIA PRIORIDAD (Meses 2-3)

12. **Sistema de migraciones de base de datos**
13. **Implementar sistema de toasts (react-hot-toast)**
14. **Extraer duplicaciones (tareasOptions, formatCurrency, PDF handlers)**
15. **Agregar paginación en endpoints**
16. **Implementar caché de payroll por mes**
17. **Error Boundaries en frontend**
18. **Agregar CustomEvent de `auth:unauthorized` con tipado fuerte**
19. **Validación de variables de entorno al iniciar**

## BAJA PRIORIDAD (Meses 3-6)

20. **Dockerizar la aplicación**
21. **Implementar CI/CD con GitHub Actions**
22. **Migrar a HttpOnly cookies para JWT**
23. **Agregar tests de integración y E2E**
24. **Mejorar accesibilidad (WCAG 2.1 AA)**
25. **Implementar PWA (offline support)**
26. **Sistema de backups automatizados**
27. **Monitoreo con Sentry**
28. **IA: Detección de anomalías en horas extras**

---

# 19. FASE 18 — EVALUACIÓN NUMÉRICA

| Dimensión | Nota (1-10) | Justificación |
|-----------|-------------|---------------|
| **Arquitectura** | 3/10 | Monolito sin capas. Backend 358 líneas en un archivo. Sin separación de concerns. Frontend mejor organizado pero sin router. |
| **Calidad del Código** | 5/10 | Código funcional pero con duplicación, uso de `any`, anti-patrones. El backend en JS vs frontend en TS es inconsistente. |
| **Seguridad** | 2/10 | Vulnerabilidades críticas: credenciales hardcodeadas, SSL sin verificación, sin rate limiting, sin headers de seguridad, token en localStorage. |
| **Rendimiento** | 5/10 | Adecuado para el volumen actual. Sin paginación ni caché. Las queries sin índices se degradarán con datos. |
| **Escalabilidad** | 3/10 | No escala más allá de unos pocos miles de usuarios sin cambios mayores. Sin paginación, sin caché, sin colas. |
| **UX** | 6/10 | Diseño visual agradable. Navegación intuitiva. Perjudicado por `alert()`, falta de loaders, sin deep linking. |
| **DevOps** | 2/10 | Sin Docker, CI/CD, health checks, backup strategy, o validación de env vars. Solo Vercel deploy manual. |
| **Testing** | 2/10 | Solo 7 tests unitarios backend (money + payroll). Sin tests frontend, integración o E2E. ~5% cobertura. |
| **Documentación** | 1/10 | README es el template de Vite sin modificar. Sin docs de API, arquitectura, deploy, o onboarding. |
| **Mantenibilidad** | 4/10 | Frontend TypeScript ayuda. Backend JS y monolito dificultan. Duplicación de código. Sin migrations. |
| **Legibilidad** | 6/10 | Nombres generalmente claros. Comentarios útiles en lógica de negocio. Estilos inline perjudican lectura de JSX. |

---

# 20. FASE 19 — PLAN MAESTRO

## 20.1 Arquitectura Objetivo

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                      │
│  React 19 + TypeScript + React Router + TanStack│
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Pages   │ │Components│ │  Services (RQ)   │ │
│  └─────────┘ └──────────┘ └──────────────────┘ │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                         │
├────────────────────────┼─────────────────────────┤
│                    BACKEND (TypeScript)           │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ Routes   │→ │Controllers│→ │  Services     │ │
│  └──────────┘  └───────────┘  └──────┬───────┘ │
│         │                            │          │
│    ┌────┴────┐              ┌───────┴───────┐  │
│    │Middleware│              │  Repositories │  │
│    │Auth, Val │              └───────┬───────┘  │
│    │RateLimit │                      │          │
│    └─────────┘              ┌───────┴───────┐  │
│                             │  PostgreSQL   │  │
│                             └───────────────┘  │
├─────────────────────────────────────────────────┤
│                    DEVOPS                        │
│  Docker → GitHub Actions → Vercel/Neon          │
│  Health Checks, Monitoring (Sentry), Backups    │
└─────────────────────────────────────────────────┘
```

## 20.2 Backlog Técnico (Deuda Técnica)

| Deuda | Esfuerzo Estimado | Riesgo de No Abordar |
|-------|-------------------|---------------------|
| Secretos hardcodeados (JWT, admin, DB) | 2h | Compromiso total del sistema |
| Backend monolítico en JS | 40h | Imposibilidad de escalar/mantener |
| Sin migraciones de DB | 8h | Inconsistencia de esquema, pérdida de datos |
| Sin tests de integración | 24h | Regresiones no detectadas |
| Sin CI/CD | 8h | Deploys manuales propensos a error |
| Duplicación de código | 4h | Bugs por inconsistencia |
| Sin paginación/caché | 8h | Degradación con volumen |
| Sin router frontend | 8h | Mala UX, sin compartir URLs |
| AppContext gigante | 12h | Acoplamiento, difícil testear |
| Token en localStorage | 8h | Vulnerable a XSS |

## 20.3 Plan de Migración por Fases

### Fase 1: Estabilización de Seguridad (Semana 1) — 8h
- Rotar credenciales
- Configurar env vars en Vercel
- Rate limiting + Helmet
- Eliminar hardcodes

### Fase 2: Backend TypeScript Modular (Semanas 2-4) — 40h
- Configurar TS en backend
- Separar archivos: routes, controllers, services, repositories
- Implementar migraciones
- Agregar índices DB y paginación

### Fase 3: Frontend Modernización (Semanas 5-7) — 40h
- React Router
- React Query para estado del servidor
- Extraer duplicaciones
- Toast system
- Error boundaries
- Loading states

### Fase 4: Testing (Semanas 8-10) — 32h
- Unit tests backend (80% cobertura)
- Integration tests API
- Component tests frontend
- E2E smoke tests

### Fase 5: DevOps y Observabilidad (Semanas 11-13) — 24h
- Docker + docker-compose
- GitHub Actions CI/CD
- Sentry integration
- Health checks
- Backup strategy

### Fase 6: Mejoras Avanzadas (Meses 4-6) — 40h+
- HttpOnly cookies
- Accesibilidad WCAG 2.1 AA
- PWA offline support
- IA: detección de anomalías
- Dashboard de analytics

## 20.4 Estimación de Esfuerzo Total
- **Total:** ~184 horas de desarrollo (~4.5 sprints de 2 semanas con 2 devs)
- **Quick wins (alto impacto, bajo esfuerzo):** 16h (Fase 1 + eliminación de duplicados)
- **Crítico inmediato:** 8h

## 20.5 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Exposición de credenciales en producción | Alta | Crítico | Rotación inmediata + env vars en Vercel |
| Rotura de funcionalidad durante refactor | Media | Alto | Tests antes de refactorizar |
| Incompatibilidad Express 5 con middleware | Media | Medio | Verificar compatibilidad; considerar Express 4 |
| Neon.tech downtime | Baja | Alto | Backup strategy + multi-region |
| Pérdida de datos por migración mal ejecutada | Baja | Alto | Backup antes de migrar; transacciones |

## 20.6 Dependencias entre Tareas

```
Fase 1 (Seguridad) → Sin dependencias, ejecutar INMEDIATAMENTE
Fase 2 (Backend TS) → Depende de Fase 1
Fase 3 (Frontend) → Puede ejecutarse en paralelo con Fase 2
Fase 4 (Testing) → Depende de Fase 2 y 3
Fase 5 (DevOps) → Puede ejecutarse en paralelo con Fase 4
Fase 6 (Avanzadas) → Depende de Fase 2-5 completas
```

---

# 21. LISTA DE ACCIONES INMEDIATAS (PRIMERAS 24 HORAS)

1. [ ] **Rotar contraseña de Neon.tech** y actualizar `DATABASE_URL` en Vercel
2. [ ] **Configurar `JWT_SECRET`** en Vercel con valor generado vía `crypto.randomBytes(64).toString('hex')`
3. [ ] **Configurar `ADMIN_USER` y `ADMIN_PASSWORD`** en Vercel
4. [ ] **Eliminar fallbacks hardcodeados** de `api/index.js` y `api/middlewares/auth.js`
5. [ ] **Agregar validación de env vars** al inicio del servidor
6. [ ] **Instalar helmet y express-rate-limit** y configurar en `api/index.js`
7. [ ] **Eliminar `rejectUnauthorized: false`** condicionado a no producción
8. [ ] **Eliminar archivo `.env`** del filesystem después de migrar a Vercel env vars

---

# 22. CONCLUSIÓN EJECUTIVA

El proyecto **Horas Extras Entel** es un MVP funcional que resuelve un problema real de negocio: el cálculo automatizado de liquidaciones de sueldo para técnicos de campo. La calidad del frontend es aceptable para un MVP, con un design system visual agradable y componentes razonablemente organizados.

Sin embargo, el proyecto **NO está listo para producción empresarial** en su estado actual. Las vulnerabilidades de seguridad son críticas e inaceptables: credenciales de base de datos expuestas, secretos JWT hardcodeados, SSL sin verificación, y falta de protecciones básicas contra ataques comunes.

La arquitectura del backend es el punto más débil: un monolito de 358 líneas en JavaScript sin capas, sin TypeScript, y con la inicialización de base de datos embebida en el código de la aplicación. Esto hace que el sistema sea frágil, difícil de mantener, y casi imposible de escalar.

**Calificación final: 5.2/10**

**Recomendación principal:** Abordar las 8 acciones inmediatas de seguridad (Fase 1, 8 horas de esfuerzo) antes de cualquier otro desarrollo. Luego, ejecutar el plan de migración por fases para transformar el MVP en un producto de nivel empresarial. El esfuerzo total estimado para alcanzar un nivel de producción sólido es de ~184 horas de desarrollo.

**Veredicto:** ✅ **Aprobado condicionalmente para MVP interno**, con la condición de que los problemas de seguridad críticos se resuelvan en las próximas 24 horas. 🔴 **No aprobado para producción externa** sin completar al menos las Fases 1-3 del plan maestro.

---

*Informe generado por el equipo de auditoría técnica integral.*
*Horas Extras Entel — 28 de Julio de 2026*
