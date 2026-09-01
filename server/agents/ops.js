import { generateText } from 'ai';
import { pool } from '../config/db.js';
import { getConfig } from '../config/env.js';
import { isAgentConfigured, getAgentModelBySpec } from './llm.js';
import { logInvocation } from './telemetry.js';
import { logger } from '../utils/logger.js';

const OPS_TIMEOUT_MS = 45000;

const OPS_SYSTEM_PROMPT = `Eres el agente de operaciones de "Entel Horas Extras".
Recibiras un diagnostico tecnico en JSON (estado de BD, failover, telemetria de agentes, backup).
Redacta en markdown, espanol de Chile, para el administrador del sistema:

## Estado del sistema
(verde/amarillo/rojo con 1 linea)
## Hallazgos
(bullets: que esta bien, que requiere atencion - maximo 5)
## Acciones recomendadas
(bullets accionables priorizados - solo si hay hallazgos rojos o amarillos)

Reglas:
- NO inventes datos: usa exclusivamente el JSON entregado.
- Si todo esta OK, mantenlo breve (maximo 60 palabras).
- Los errores: cita el gateway/modelo exacto y la sugerencia concreta.`;

async function collectDiagnostics() {
  const env = getConfig();
  const diag = {
    timestamp: new Date().toISOString(),
    entorno: { nodeEnv: env.NODE_ENV, isVercel: env.isVercel },
    baseDatos: { ok: null, latencyMs: null, onFallback: null },
    agentes: {
      gatewaysActivos: ['primary', 'secondary', 'ollama', 'gemini', 'cerebras', 'backup'].filter((t) => {
        const map = {
          primary: Boolean(env.LLM_API_KEY && env.LLM_BASE_URL),
          secondary: Boolean(env.LLM_SECONDARY_API_KEY && env.LLM_SECONDARY_BASE_URL),
          ollama: Boolean(env.LLM_OLLAMA_API_KEY && env.LLM_OLLAMA_BASE_URL),
          gemini: Boolean(env.LLM_GEMINI_API_KEY && env.LLM_GEMINI_BASE_URL),
          cerebras: Boolean(env.LLM_CEREBRAS_API_KEY && env.LLM_CEREBRAS_BASE_URL),
          backup: Boolean(env.LLM_BACKUP_API_KEY && env.LLM_BACKUP_BASE_URL),
        };
        return map[t];
      }),
    },
    telemetria24h: null,
    errores24h: null,
  };

  const t0 = Date.now();
  try {
    await pool.query('SELECT 1');
    diag.baseDatos.ok = true;
    diag.baseDatos.latencyMs = Date.now() - t0;
    const { poolManager } = await import('../config/db-failover.js');
    diag.baseDatos.onFallback = poolManager.isOnFallback ?? false;
  } catch (err) {
    diag.baseDatos.ok = false;
    diag.baseDatos.error = err.message;
  }

  try {
    const { rows: tele } = await pool.query(
      `SELECT gateway, model, status, COUNT(*) AS count, ROUND(AVG(latency_ms))::int AS avg_ms
       FROM agent_invocations WHERE created_at >= now() - interval '24 hours'
       GROUP BY gateway, model, status ORDER BY count DESC LIMIT 20`
    );
    diag.telemetria24h = tele;
    const { rows: errs } = await pool.query(
      `SELECT gateway, model, COUNT(*) AS count, MAX(error_message) AS last_error
       FROM agent_invocations
       WHERE status <> 'ok' AND created_at >= now() - interval '24 hours'
       GROUP BY gateway, model ORDER BY count DESC LIMIT 10`
    );
    diag.errores24h = errs;
  } catch (err) {
    diag.telemetriaError = err.message;
  }

  return diag;
}

export async function runOpsDiagnosis({ requesterId }) {
  if (!isAgentConfigured()) {
    return { ok: false, error: 'Agentes no configurados.' };
  }

  const env = getConfig();
  const resolved = env.LLM_JSON_MODEL ? getAgentModelBySpec(env.LLM_JSON_MODEL) : null;
  if (!resolved) {
    return { ok: false, error: 'Modelo de operaciones no configurado.' };
  }

  const diag = await collectDiagnostics();

  const t0 = Date.now();
  try {
    const { text } = await generateText({
      model: resolved.model,
      system: OPS_SYSTEM_PROMPT,
      prompt: 'Diagnostico del sistema (JSON):\n' + JSON.stringify(diag),
      maxRetries: 1,
      maxOutputTokens: 900,
      abortSignal: AbortSignal.timeout(OPS_TIMEOUT_MS),
    });

    logInvocation({
      userId: requesterId,
      agent: 'ops',
      gateway: resolved.gateway,
      model: resolved.modelId,
      status: 'ok',
      latencyMs: Date.now() - t0,
    });

    return { ok: true, diagnosis: text, data: diag, model: resolved.modelId, gateway: resolved.gateway, ms: Date.now() - t0 };
  } catch (err) {
    logInvocation({
      userId: requesterId,
      agent: 'ops',
      gateway: resolved.gateway,
      model: resolved.modelId,
      status: 'error',
      latencyMs: Date.now() - t0,
      errorMessage: err.message,
    });
    logger.error('Ops diagnosis failed', { message: err.message });
    return { ok: false, error: 'El diagnostico no pudo completarse.', data: diag };
  }
}