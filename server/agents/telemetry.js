import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

export async function logInvocation({ userId, sessionId, agent = 'assistant', gateway, model, status, latencyMs = null, tokensIn = 0, tokensOut = 0, finishReason = null, errorMessage = null }) {
  try {
    await pool.query(
      `INSERT INTO agent_invocations
         (user_id, session_id, agent, gateway, model, status, latency_ms, tokens_in, tokens_out, finish_reason, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, sessionId, agent, gateway, model, status, latencyMs, tokensIn, tokensOut, finishReason, errorMessage ? String(errorMessage).slice(0, 500) : null]
    );
  } catch (err) {
    logger.error('Invocation telemetry failed (non-blocking):', { message: err.message });
  }
}

export async function getUsageSummary({ days = 7 } = {}) {
  const { rows } = await pool.query(
    `SELECT gateway, model,
            COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
            COUNT(*) FILTER (WHERE status <> 'ok') AS fail_count,
            ROUND(AVG(latency_ms) FILTER (WHERE status = 'ok'))::int AS avg_latency_ms,
            SUM(tokens_in)::int AS tokens_in,
            SUM(tokens_out)::int AS tokens_out
     FROM agent_invocations
     WHERE created_at >= now() - ($1 || ' days')::interval
     GROUP BY gateway, model
     ORDER BY ok_count DESC, gateway`,
    [String(days)]
  );
  return rows;
}
