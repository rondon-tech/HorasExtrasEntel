# Decisiones técnicas

## Arquitectura en capas (ADR-001)
**Decisión**: Separar backend en routes → controllers → repositories + services + mappers.  
**Por qué**: El `api/index.js` original era monolítico (401 líneas). Imposible de testear.  
**Descartado**: DDD completo (sobreingeniería para MVP), Prisma ORM (oculta optimización de queries).

## Migraciones versionadas (ADR-002)
**Decisión**: node-pg-migrate en vez de `CREATE TABLE IF NOT EXISTS` inline.  
**Por qué**: La tabla se creaba en cada arranque del servidor. Sin rollback, sin versionado.  
**Descartado**: Seguir con DDL inline (riesgo de esquema inconsistente).

## React Router v7 (ADR-003)
**Decisión**: Navegación declarativa con rutas URL en vez de `useState('dashboard')` + switch.  
**Por qué**: URLs compartibles, back/forward del navegador, lazy loading por ruta.  
**Descartado**: Mantener switch manual (sin deep linking).

## React Query (ADR-004)
**Decisión**: TanStack React Query para server state. AppContext solo para UI state.  
**Por qué**: AppContext tenía 262 líneas mezclando UI y datos. Sin caché, sin invalidación automática.  
**Descartado**: Manual `useEffect` + `fetch` (ya implementado, se eliminó).

## PostgreSQL sin ORM
**Decisión**: `pg` con SQL crudo en repositorios.  
**Por qué**: Control total sobre queries, sin capa de abstracción. Para MVP con 5 tablas, un ORM añade complejidad innecesaria.  
**Descartado**: Prisma, Sequelize, TypeORM.

## Neon.tech como BD
**Decisión**: PostgreSQL serverless en Neon.tech (AWS us-east-1).  
**Por qué**: Gratuito (Hobby), sin gestión de servidor, compatible con Vercel serverless (connection pooling).  
**Descartado**: PostgreSQL autogestionado (Docker local para dev), RDS (coste).

## Dual-pool con failover automático
**Decisión**: PoolManager en `db-failover.js` con PRIMARY y FALLBACK.  
**Por qué**: Si Neon #1 cae, cambia a Neon #2 tras 3 fallos consecutivos. Health check cada 60s para volver.  
**Descartado**: Pool único (riesgo de downtime).

## Vercel Edge Middleware para rate limiting
**Decisión**: `middleware.ts` en el edge en vez de `express-rate-limit` global.  
**Por qué**: `express-rate-limit` usa store en memoria que se pierde entre cold starts de serverless. El edge corre antes de la función y no consume ejecución.  
**Descartado**: Upstash Redis KV (añade dependencia externa y coste).

## Service Worker con cache-stale-while-revalidate
**Decisión**: PWA con SW que cachea `index.html` y assets. API con network-first.  
**Por qué**: Soporte offline parcial, carga instantánea en visitas repetidas.  
**Riesgo conocido**: Cache v1 causó pantalla en blanco al cambiar los hashes de los bundles (corregido en v2). [Ver errores-conocidos.md]

## JWT en localStorage (temporal)
**Decisión**: Token JWT en `localStorage` con interceptors en Axios.  
**Por qué**: MVP rápido. Sin dominio custom en Vercel, las cookies HttpOnly no son viables.  
**Pendiente**: Migrar a HttpOnly cookies cuando se configure dominio propio.
