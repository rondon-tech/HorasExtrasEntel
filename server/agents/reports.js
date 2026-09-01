import { generateText } from 'ai';
import { pool } from '../config/db.js';
import { getConfig } from '../config/env.js';
import { recordRepository } from '../repositories/record.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { paramsRepository } from '../repositories/params.repository.js';
import { calculatePayroll } from '../services/payroll.service.js';
import { isAgentConfigured, getAgentModelBySpec } from './llm.js';
import { logInvocation } from './telemetry.js';
import { logger } from '../utils/logger.js';

const REPORT_TIMEOUT_MS = 60000;
const REPORT_MAX_USERS = 50;

const REPORT_SYSTEM_PROMPT = `Eres el agente de reportes administrativos de "Entel Horas Extras" (Entel Chile).
Recibiras datos agregados y verificados de liquidaciones del sistema (calculados por el servidor).
Tu unico trabajo es redactar un informe ejecutivo en markdown, en espanol de Chile, usando EXCLUSIVAMENTE los datos entregados.

Formato obligatorio:
# Reporte de liquidaciones - {mes}
## Resumen ejecutivo
(3-4 bullets: total liquido, horas extras globales, anomalias)
## Detalle por tecnico
(tabla markdown: tecnico | horas extras | pago extras | bonos | liquido | anomalias)
## Anomalias detectadas
(lista de tecnicos con anomalias abiertas y su tipo; si no hay: "Sin anomalias abiertas.")
## Observaciones
(maximo 3 bullets que el administrador deberia revisar antes del cierre)

Reglas estrictas:
- NO inventes ningun numero: usa solo los datos entregados.
- Formato CLP: $1.234.567
- Maximo 400 palabras en total.`;

async function buildMonthlyData(userId, year, month) {
  const [records, expenses, params] = await Promise.all([
    recordRepository.findByMonth(userId, year, month),
    expenseRepository.findByMonth(userId, year, month),
    paramsRepository.findFirstRaw(userId),
  ]);
  if (!params) return null;
  const payroll = calculatePayroll(records, expenses, params);
  const { rows: anomalies } = await pool.query(
    `SELECT type, score FROM agent_anomalies
     WHERE user_id = $1 AND status = 'open' AND created_at >= make_date($2, $3, 1)
       AND created_at < make_date($2, $3, 1) + interval '1 month'`,
    [userId, year, month]
  );
  const { rows: userRows } = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
  return {
    username: userRows[0]?.username || userId,
    horasExtras: payroll.totalExtraHoursThisMonth,
    pagoExtras: payroll.totalExtraPayThisMonth,
    bonoCompensatorio: payroll.bonoCompensatorio,
    liquido: payroll.liquidoAPagar,
    anomalias: anomalies.map((a) => `${a.type} (score ${Number(a.score)})`),
  };
}

export async function generateGlobalMonthlyReport({ year, month, requesterId }) {
  if (!isAgentConfigured()) {
    return { ok: false, error: 'Agentes no configurados.' };
  }

  const { rows: usersWithRecords } = await pool.query(
    `SELECT DISTINCT r.user_id, u.username
     FROM records r JOIN users u ON u.id = r.user_id
     WHERE EXTRACT(YEAR FROM r.date) = $1 AND EXTRACT(MONTH FROM r.date) = $2
     LIMIT $3`,
    [year, month, REPORT_MAX_USERS]
  );

  const techs = [];
  for (const row of usersWithRecords) {
    try {
      const data = await buildMonthlyData(row.user_id, year, month);
      if (data) techs.push(data);
    } catch (err) {
      logger.error('Report builder failed for user', { userId: row.user_id, message: err.message });
    }
  }

  if (techs.length === 0) {
    return { ok: true, report: `# Reporte de liquidaciones - ${year}-${String(month).padStart(2, '0')}\n\nSin registros este mes.`, model: null, gateway: null, ms: 0 };
  }

  const totals = techs.reduce(
    (acc, t) => ({
      liquido: acc.liquido + t.liquido,
      horas: acc.horas + t.horasExtras,
      anomalias: acc.anomalias + t.anomalias.length,
    }),
    { liquido: 0, horas: 0, anomalias: 0 }
  );

  const env = getConfig();
  const resolved = env.LLM_REPORT_MODEL ? getAgentModelBySpec(env.LLM_REPORT_MODEL) : null;

  if (!resolved) {
    return { ok: false, error: 'Modelo de reportes no configurado (LLM_REPORT_MODEL).' };
  }

  const dataPayload = {
    mes: `${year}-${String(month).padStart(2, '0')}`,
    resumenGlobal: {
      tecnicosConRegistros: techs.length,
      totalHorasExtras: Math.round(totals.horas * 100) / 100,
      totalLiquido: Math.round(totals.liquido),
      anomaliasAbiertas: totals.anomalias,
    },
    tecnicos: techs.map((t) => ({
      tecnico: t.username,
      horasExtras: t.horasExtras,
      pagoExtras: t.pagoExtras,
      bonoCompensatorio: t.bonoCompensatorio,
      liquido: t.liquido,
      anomalias: t.anomalias,
    })),
  };

  const t0 = Date.now();
  try {
    const { text } = await generateText({
      model: resolved.model,
      system: REPORT_SYSTEM_PROMPT,
      prompt: `Datos verificados del sistema:\n${JSON.stringify(dataPayload)}`,
      maxRetries: 1,
      maxOutputTokens: 2500,
      abortSignal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    });

    logInvocation({
      userId: requesterId,
      agent: 'reports',
      gateway: resolved.gateway,
      model: resolved.modelId,
      status: 'ok',
      latencyMs: Date.now() - t0,
      tokensOut: text.length,
    });

    return { ok: true, report: text, model: resolved.modelId, gateway: resolved.gateway, ms: Date.now() - t0 };
  } catch (err) {
    logInvocation({
      userId: requesterId,
      agent: 'reports',
      gateway: resolved.gateway,
      model: resolved.modelId,
      status: 'error',
      latencyMs: Date.now() - t0,
      errorMessage: err.message,
    });
    logger.error('Report generation failed', { message: err.message });
    return { ok: false, error: 'El modelo de reportes no respondio. Intentalo de nuevo.' };
  }
}