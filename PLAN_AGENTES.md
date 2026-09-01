# PLAN — Sistema Agéntico para HorasExtrasEntel

> **Aprobado:** 28 de agosto de 2026
> **Modelo LLM:** GLM 5.3 Flash vía endpoint compatible con OpenAI (configurable por env)
> **Runtime:** híbrido — Vercel (chat rápido) + worker externo (tareas largas, Fase 2+)
> **Permisos:** lectura libre sobre datos propios + escrituras siempre confirmadas y auditadas

## 1. Objetivo

Sistema multi-agente sobre la arquitectura existente (Vercel + Express 5 + Neon) donde un **orquestador** enruta solicitudes a **agentes especializados** según el caso, con permisos de solo lectura por defecto y escrituras siempre confirmadas por el usuario y auditadas.

## 2. Catálogo de agentes (estado 2026-08-31, post Fase 2)

| Agente | Función | Estado |
|---|---|---|
| **A1 — Anomalías** | Reglas deterministas en cada POST/PUT + job enriquecimiento IA (cron GitHub Actions cada 6h: .github/workflows/agent-enrich.yml) + **UI de revisión en AdminPanel** (GET /agent/anomalies/all con JOIN al registro, filtro por estado, revisar/descartar) | ✅ Operativo + UI |
| **A2 — Asistente** | Chat streaming + grounding + 12 modelos en cascada | ✅ Operativo |
| **A3 — OCR tickets** | POST /api/agent/ocr: foto → JSON zod-validado. Cadena de visión: minimax-m3 → gemma4:31b → gemini-3.6-flash. UI de captura en Expenses | ✅ Operativo (F2) |
| **A4 — Reportes admin** | POST /api/agent/reports/monthly (UI AdminPanel) + **reporte mensual programado** (cron día 1: .github/workflows/agent-monthly-report.yml → artifact markdown) | ✅ Operativo + cron |
| **A5 — Operaciones** | Diagnóstico on-demand (F3) + **restore-drill mensual automatizado** (.github/workflows/agent-restore-drill.yml → scripts/restore-drill.mjs: valida backup <26h, restaura en BD efímera, verifica conteos) | ✅ Operativo + drill |
| **A6 — Voz** | POST /api/agent/voice: MediaRecorder → whisper-large-v3-turbo (Groq) → parser zod → pre-llenado del registro. UI mic en DailyRecord | ✅ Operativo (F3) |
| A7 embeddings (Gemini) | Busqueda semantica historica | 💡 Detectado |

## 3. Arquitectura

```
Frontend React (AssistantPanel, streaming de texto)
   │  POST /api/agent/chat
   ▼
Orquestador (registro de agentes) → Agente → Tools (zod) → Repositorios existentes
   │                                            (read-only, user_id SIEMPRE del JWT)
   ▼  tareas largas (Fase 2+)
Worker: Inngest (batch mensual de anomalías, reportes, restore-drill)
```

**Decisiones:**
- **SDK:** Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`) — **4 gateways en cascada + modelos por agente** (benchmarks 2026-08-29, 25 modelos, 3 pruebas c/u):
  - **Primario Groq:** `qwen/qwen3.8-27b` (A2 chat 0.8s; A1 JSON 0.5s) + `gpt-oss-120b/20b` fallback.
  - **Secundario OpenRouter:** `minimax-m3:free` (A3 OCR visión, 3.4s) → nemotron-super → ling.
  - **Terciario Ollama Cloud:** `gpt-oss:120b` (2.1s tools — A4 reportes) → `gpt-oss:20b`. `gemma4:31b` visión 0.9s (2ª opción OCR). GLM/qwen/kimi/mistral de su catálogo exigen suscripción (402).
  - **Gemini (Google AI Studio):** `gemini-3.6-flash` (tools 8.2s, **visión OCR 2.7s**, JSON OK con max_tokens≥2000 — el thinking consume budget) → `gemini-3.5-flash`. Endpoint OpenAI-compatible `/v1beta/openai`. También disponible: embeddings-2 (búsqueda semántica futura), 3.5-transcribe (voz futura).
  - **Cerebras (dormente):** cuenta sin créditos (402 en toda inferencia; catálogo: `gpt-oss-120b`, `gemma-4-31b`). Tier ya cableado — se activa con `LLM_CEREBRAS_*` al recargar créditos; benchmark pendiente.
  - **Respaldo TokenRouter:** `z-ai/glm-5.3-free` (razonamiento, ~60s) + qwen3.8-max.
  - Specs por agente: `LLM_JSON_MODEL`, `LLM_VISION_MODEL` (`secondary:...`), `LLM_REPORT_MODEL` (`ollama:gpt-oss:120b`).
- **Grounding anti-alucinación:** snapshot del mes actual (calculatePayroll server-side, caché 60s) inyectado en cada turno. Verificado sin alucinaciones en seguimientos.
- **⚠️ OCR:** vision chain planificada: minimax-m3 → gemma4:31b (2 gateway independientes).
- **Futuro:** whisper-large-v3 (Groq) para registro por voz.
- **Tools:** schemas zod que envuelven los repositorios existentes en modo solo lectura. El LLM nunca genera SQL.
- **Memoria:** sesiones y mensajes en Postgres (`agent_sessions`, `agent_messages`).
- **Escritura confirmada:** proposal → ConfirmDialog en UI → ejecución por el controller existente (misma validación y auditoría).

## 4. Esquema de BD (migración 008)

- Fix crítico de auditoría: `audit_log.action VARCHAR(10) → VARCHAR(30)`.
- Tablas: `agent_sessions`, `agent_messages`, `agent_proposals`, `agent_anomalies`.

## 5. Seguridad

1. Autorización server-side: todo tool recibe `userId` del JWT; el LLM jamás pasa IDs.
2. Anti prompt-injection: solo tools predefinidas; outputs validados; inputs de usuario marcados como datos.
3. Confirmación explícita de escrituras + registro en `audit_log` (acción `AGENT_ACTION`).
4. Presupuesto de tokens/día por usuario (`AGENT_DAILY_TOKEN_BUDGET`) + rate limit propio.
5. PII: nunca loguear sueldos/contraseñas; masking en logs de agente.

## 6. Testing

- Evals de anomalías (reglas deterministas, testeadas con vitest).
- Tests de tools con pool mockeado (patrón existente en `server/repositories/index.test.js`).
- Regla: ningún agente a producción sin suite de evals verde.

## 7. Requerimientos

- Deps nuevas: `ai`, `@ai-sdk/openai-compatible` (instaladas).
- Env: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `AGENT_DAILY_TOKEN_BUDGET`.
- Prerrequisitos de auditoría incluidos: `audit_log` VARCHAR(30), Sentry condicionado a `SENTRY_DSN`, tope `.max(12)` en `extraHours`, errorHandler sin fuga de datos, fix `app.all('*')`, debug endpoint solo en dev.

## 8. Roadmap

| Fase | Contenido | Esfuerzo |
|---|---|---|
| **0** | Prerrequisitos + migración 008 + cliente LLM + presupuesto + sesiones | 1–2 días |
| **1** | A1 anomalías + A2 asistente + AssistantPanel + tests | 5–7 días |
| **2** | A3 OCR + A4 reportes admin vía Inngest | 4–5 días |
| **3** | A5 operaciones + restore-drill + dashboard de costos | 3–4 días |
