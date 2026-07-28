# SECURITY REMEDIATION — Acciones humanas obligatorias

> Este documento lista las credenciales comprometidas detectadas durante la Fase 0
> de la ejecución del Plan Maestro de Remediación. **Estas acciones requieren intervención
> humana y no pueden ser automatizadas por el agente de ejecución.**

## Estado: CRÍTICO

### 1. Credenciales de Neon.tech PostgreSQL — COMPROMETIDAS
- **Dónde estaban expuestas:** commit `84bca86` (28 Jun 2026) en `https://github.com/rondon-tech/HorasExtrasEntel` (repositorio público/privado en GitHub).
- **Usuario:** `neondb_owner`
- **Contraseña comprometida:** `npg_REDACTED`
- **Acción requerida:**
  1. Iniciar sesión en https://console.neon.tech
  2. Rotar la contraseña del proyecto (Settings → Branch → Reset password) o crear un nuevo rol.
  3. Actualizar `DATABASE_URL` en las variables de entorno de Vercel (Project → Settings → Environment Variables).
  4. Actualizar localmente el archivo `.env` con la nueva URL (no commitearlo).
- **Justificación:** Aunque el `.env` se eliminó en commits posteriores, el secreto permanece en el historial de git y ya fue empujado a GitHub. Cualquiera con acceso al repo puede recuperarlo.

### 2. Token de GitHub (PAT) — COMPROMETIDO
- **Token expuesto:** `ghp_REDACTED` (estaba embebido en la URL del remote `origin`).
- **Acción requerida:**
  1. Revocar el token en https://github.com/settings/tokens (Eliminar).
  2. Crear un nuevo token con scopes mínimos si es necesario (preferir GitHub CLI o credential helper).
  3. Configurar el remote con credential helper: `git config --global credential.helper manager` (Windows) o `store` (Linux/macOS).
  4. Considerar migrar el remote a SSH: `git remote set-url origin git@github.com:rondon-tech/HorasExtrasEntel.git`.
- **Estado actual:** El agente ya reemplazó la URL del remote por una versión limpia (sin PAT embebido).

### 3. Secretos hardcodeados en código fuente — REMEDIADOS por el agente (Sprint 1)
- `JWT_SECRET` fallback `'dev-secret-key-12345'` — se elimina en T002.
- `ADMIN_USER`/`ADMIN_PASSWORD` fallbacks `'admin'`/`'password123'` — se eliminan en T003.
- **Acción requerida aún así:** Configurar valores reales y fuertes en las variables de entorno de Vercel antes del próximo deploy.

### 4. Considerar purgar el historial de git (opcional pero recomendado)
- Tools como `git filter-repo` o BFG Repo-Cleaner pueden eliminar el `.env` del historial.
- **Riesgo:** Reescribe el historial; requiere force-push y coordina con todos los colaboradores.
- **Recomendación:** Si el repo es privado y tiene pocos colaboradores, hacerlo tras rotar credenciales. Si ya se rotaron las credenciales comprometidas, el riesgo residual es bajo.

## Verificación de completitud

Antes de cualquier deploy a producción:

- [ ] Contraseña Neon.tech rotada y verificada (`psql` con nueva URL funciona)
- [ ] GitHub PAT revocado
- [ ] `JWT_SECRET` (256+ bits) configurado en Vercel env vars
- [ ] `ADMIN_USER` y `ADMIN_PASSWORD` configurados en Vercel env vars
- [ ] `DATABASE_URL` actualizada en Vercel con la nueva contraseña
- [ ] `FRONTEND_URL` configurada en Vercel con el dominio real
- [ ] App de producción levanta con las nuevas env vars y responde 200 en `/api/health` (cuando se implemente)