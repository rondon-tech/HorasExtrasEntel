# Convenciones

## Nomenclatura

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Archivos backend | kebab-case.js | `record.controller.js`, `auth.routes.js` |
| Archivos frontend | PascalCase.tsx | `DailyRecord.tsx`, `AppContext.tsx` |
| Tablas SQL | snake_case plural | `records`, `expenses`, `audit_log` |
| Columnas SQL | snake_case | `day_type`, `extra_hours`, `password_hash` |
| Variables JS/TS | camelCase | `extraHours`, `isAuthenticated` |
| Interfaces TS | PascalCase | `DailyRecord`, `MonthlyParams` |
| Exportaciones | named exports (`export const`/`export function`) | No se usa `export default` salvo en entry points |
| Commits | conventional commits en español | `feat:`, `fix:`, `chore:`, `docs:`, `deploy:`, `test:` |

## Estilo de código

- **Backend JS**: sin punto y coma, comillas simples, arrow functions
- **Frontend TS**: `verbatimModuleSyntax: true`, sin `enum` (usa `as const`), `noUnusedLocals: true`
- **React**: componentes funcionales con hooks. Cada pantalla lazy-loadeada con `React.lazy()`
- **CSS**: custom properties en `:root`, temas dark/light con `data-theme`, sin preprocesador

## Patrones

- **Repository Pattern**: cada entidad tiene su repository con SQL parametrizado (`$1, $2...`)
- **Mapper Pattern**: `mappers/index.ts` convierte snake_case DB ↔ camelCase DTO
- **Middleware chain**: requireAuth → validate(Zod) → controller → repository → pool
- **Cache en payroll**: Map en memoria con TTL 5 min, invalidado por mutaciones
- **Failover BD**: PoolManager con doble pool Neon.tech (3 fallos → switch, 3 éxitos → vuelta)

## Patrones PROHIBIDOS

- `alert()` — reemplazado por `react-hot-toast`
- `any` en TypeScript — usar tipos concretos o `unknown`
- Hardcodear credenciales — todo en `.env`, validado por `env.ts`
- Queries sin parametrizar — siempre `$1, $2...`, nunca template strings con variables

## Tests

- Framework: Vitest
- Ubicación: junto al archivo que testean (`*.test.js`/`*.test.ts`)
- 33 tests en 5 suites: mappers (7), repositories (9), auth middlewares (7), payroll (5), money (5)
- Sin cobertura mínima definida [PENDIENTE: definir threshold]

## Commits

- Idioma: español
- Formato: `tipo: descripción breve`
- Tipos: `feat`, `fix`, `chore`, `docs`, `deploy`, `test`, `refactor`, `ci`
