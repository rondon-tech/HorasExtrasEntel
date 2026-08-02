# Flujo de trabajo

## Para hacer un cambio

1. **Rama**: crear desde `main` con nombre descriptivo (`feat/filtros-records`, `fix/cors-login`)
2. **Código**: seguir [convenciones.md](convenciones.md). Si es backend, respetar capas (route → controller → repository)
3. **Variables de entorno**: si agregas una nueva, documentarla en `.env.example`
4. **Migraciones**: si modificas el esquema, crear nuevo archivo en `server/migrations/`

## Checklist de "terminado"

- [ ] `npx tsc -b` sin errores (frontend typecheck)
- [ ] `npx tsc -p tsconfig.backend.json --noEmit` sin errores (backend typecheck)
- [ ] `npm run lint` sin errores
- [ ] `npm test` — 33 tests pasan (agregar tests si es funcionalidad nueva)
- [ ] `npm run build` exitoso
- [ ] Probado localmente: `npm run server` + `npm run dev` (o `docker-compose up`)
- [ ] Commit con formato convencional: `feat: descripción` / `fix: descripción`
- [ ] PR a `main`

## Deploy a producción

```bash
# 1. Build local (verifica que todo compile)
npm run build

# 2. Deploy a Vercel (requiere CLI autenticada: vercel login)
vercel deploy --prod --yes

# 3. Verificar
curl https://horas-extras-entel-eight.vercel.app/api/health
```

**CI (GitHub Actions)**: en cada push/PR a `main` se ejecuta lint → typecheck → test → build automáticamente. El deploy a Vercel es manual (`vercel deploy --prod`).

## Migraciones

```bash
npm run migrate          # Aplicar pendientes (antes del deploy)
npm run migrate:down     # Rollback de la última
```

Las migraciones se corren manualmente antes del deploy. NO se ejecutan en Vercel (serverless cold start no lo permite).

## Backups

- Automáticos: GitHub Actions cada 2 horas → R2
- Manual: `npm run backup`
- Restore: `npm run restore` (restaura en BD fallback)
