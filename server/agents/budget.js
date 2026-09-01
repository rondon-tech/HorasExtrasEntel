import { pool } from '../config/db.js';
import { getConfig } from '../config/env.js';

const TZ = 'America/Santiago';

export async function getTokensUsedToday(userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(m.tokens_in + m.tokens_out), 0)::int AS used
     FROM agent_messages m
     JOIN agent_sessions s ON s.id = m.session_id
     WHERE s.user_id = $1
       AND (m.created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date`,
    [userId, TZ]
  );
  return rows[0].used;
}

export async function assertBudget(userId) {
  const { AGENT_DAILY_TOKEN_BUDGET } = getConfig();
  const used = await getTokensUsedToday(userId);

  if (used >= AGENT_DAILY_TOKEN_BUDGET) {
    const err = new Error('Presupuesto diario del asistente agotado. Vuelve a intentarlo manana.');
    err.status = 429;
    throw err;
  }

  return { used, budget: AGENT_DAILY_TOKEN_BUDGET };
}