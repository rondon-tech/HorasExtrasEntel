# Glosario

## Dominio de negocio

| Término | Definición |
|---------|-----------|
| **Horas extras** | Tiempo trabajado fuera de la jornada ordinaria. Se registran con hora inicio/fin, sitio y tarea. |
| **TAD** (Turno a Disposición) | Día de guardia sin salida a terreno. Genera bono compensatorio diario (`bono_tad`). |
| **TAD Apoyo** | Variante de TAD con tarifa propia (actualmente misma que TAD). |
| **Contingencia** | Día de disposición por emergencia. Genera bono (`bono_contingencia`). |
| **Viático** | Bono de gestión por tarea específica. Asociado a un nemónico (SA575, FN699, SA881). |
| **Nemónico** | Código identificador de tipo de viático. Opciones: SA575, FN699, SA881, Otro. |
| **Liquidación** | Cálculo completo del sueldo mensual: haberes imponibles + descuentos legales + bonos = líquido a pagar. |
| **Haberes imponibles** | Sueldo base + gratificación + incentivo producción + horas extras. Base para calcular AFP/salud/cesantía. |
| **Descuentos legales** | AFP (~11.44%), Salud (7%), Cesantía (0.6%). |
| **Impuesto único** | Impuesto de segunda categoría (tabla chilena). Se aplica sobre base tributable. |
| **Parámetros** (`params`) | Tabla single-row con sueldos, tasas, bonos y descuentos. Configurable desde /settings. |

## Entidades principales

| Entidad | Tabla | Props clave |
|---------|-------|------------|
| Record | `records` | date, dayType (Normal/TAD/TAD Apoyo), sitio, numeroTarea, tarea, extraHours, isFeriado, isContingencia |
| Expense | `expenses` | date, nemonico (SA575/FN699/SA881/Otro), description |
| Params | `params` (single row, id=1) | baseSalary, gratificacion, weeklyHours, tadRate, contingencyRate, viaticoRate, afpRate, saludRate, cesantiaRate, etc. |
| User | `users` | username, password_hash (bcrypt), role (admin/supervisor/tecnico) |
| AuditLog | `audit_log` | action (INSERT/UPDATE/DELETE/LOGIN_OK/LOGIN_FAIL), entity, entityId, changedBy, details (JSONB) |

## Siglas internas

| Sigla | Significado |
|-------|------------|
| CLP | Peso chileno (moneda). Enteros sin decimales (librería `money.ts`). |
| R2 | Cloudflare R2 (object storage). Usado para backups de BD cada 2h. |
| CSP | Content Security Policy (Helmet). |
| PWA | Progressive Web App (manifest.json + service worker). |
| HMR | Hot Module Replacement (Vite dev server). |
