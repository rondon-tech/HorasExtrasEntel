# Errores conocidos

## Service Worker cachea HTML viejo → pantalla en blanco
**Causa**: El SW (`sw.js`) cachea `/` y `/index.html` con estrategia cache-first. Si el `index.html` cacheado referencia bundles con hashes antiguos que ya no existen en el deploy, el JS no carga y la app muestra pantalla blanca.  
**Fix**: Incrementar `CACHE_NAME` en `public/sw.js` (actualmente `entel-he-v2`). El evento `activate` borra caches viejas automáticamente.  
**Workaround usuario**: Abrir en incógnito o hacer "Unregister" del SW en DevTools > Application > Service Workers.

## XSS sanitizer rompe validación de login en producción
**Causa**: La librería `xss` en el middleware `validate.js` lanza error al sanitizar ciertos strings (ej. contraseñas con `@`) en el entorno de producción de Vercel (Node 24). El error no es `ZodError`, así que el middleware devuelve 500 "Internal Server Error during validation".  
**Fix**: Se removió `validate(loginSchema)` de la ruta POST `/api/login`. La validación Zod en records y expenses (crear/editar) funciona correctamente.  
**Archivo**: `server/routes/auth.routes.js` — login usa solo `loginLimiter` + `authController.login` (sin `validate`).

## `execSync` no definido en migrate.mjs
**Causa**: `migrate.mjs` usaba `execSync` del módulo `child_process` sin importarlo.  
**Fix**: Agregado `import { execSync } from 'child_process'` al inicio del archivo.  
**Archivo**: `migrate.mjs`.

## `getConfig()` crashea a nivel módulo si faltan env vars
**Causa**: `db-failover.js` originalmente llamaba `getConfig()` al importarse. Si `JWT_SECRET`, `ADMIN_USER` o `ADMIN_PASSWORD` faltaban, crasheaba antes de que Express pudiera manejar el error.  
**Fix**: `getConfig()` se movió a inicialización lazy dentro de `_getPoolManager()`. Además, `api/index.js` envuelve `getConfig()` en try-catch y, si falla, monta una app de emergencia que devuelve error JSON descriptivo.  
**Archivos**: `server/config/db-failover.js:193-213`, `api/index.js:11-48`.

## `invalidateCache()` del payroll nunca se llamaba
**Causa**: `payroll.controller.js` define `invalidateCache()` (línea 40) pero ningún controlador lo importaba/llamaba. Las mutaciones de records, expenses y params dejaban el caché de payroll obsoleto por hasta 5 minutos.  
**Fix**: Se agregó `import { payrollController } from './payroll.controller.js'` y `payrollController.invalidateCache()` en record.controller.js, expense.controller.js y params.controller.js después de cada CREATE/UPDATE/DELETE.  
**Archivos**: `server/controllers/record.controller.js`, `server/controllers/expense.controller.js`, `server/controllers/params.controller.js`.

## Paginación ausente en expenses
**Causa**: `expense.repository.js` hacía `SELECT * FROM expenses` sin `LIMIT`/`OFFSET`. Con crecimiento de datos, la respuesta crece sin control.  
**Fix**: Se agregó `findAll({ limit, offset })` y `countTotal()` al repositorio. El controlador ahora acepta `?limit=&offset=` y devuelve `{ data, total, limit, offset }`. El frontend (`useApi.ts`) pide `?limit=100`.  
**Archivos**: `server/repositories/expense.repository.js`, `server/controllers/expense.controller.js`, `src/hooks/useApi.ts`.

## Rate limiting global con express-rate-limit no funciona en Vercel
**Causa**: `express-rate-limit` usa un store en memoria que se pierde en cada cold start de la serverless function. En Vercel Hobby, múltiples instancias no comparten estado.  
**Fix**: Se movió el rate limiting a Vercel Edge Middleware (`middleware.ts`), que corre en el CDN antes de la función. Usa `globalThis` Map para contar requests por IP con sliding window.  
**Archivo**: `middleware.ts`.
