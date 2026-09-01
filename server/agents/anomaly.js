import { pool } from '../config/db.js';
import { getConfig } from '../config/env.js';
import { isAgentConfigured, getAgentModelBySpec } from './llm.js';
import { logger } from '../utils/logger.js';

const DAILY_CAP_HOURS = 12;

export function parseTimeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function shiftDurationHours({ startTime, endTime }) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return null;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

export function evaluateRecordRules(record, { monthTotalBefore = 0, monthlyCap = 60 } = {}) {
  const anomalies = [];
  const extraHours = Number(record.extraHours ?? record.extra_hours ?? 0);

  if (extraHours > DAILY_CAP_HOURS) {
    anomalies.push({
      type: 'daily_cap_exceeded',
      score: 100,
      reasons: [`Se declararon ${extraHours} h extras; el máximo legal por día es ${DAILY_CAP_HOURS} h.`],
    });
  }

  const duration = shiftDurationHours(record);
  if (duration !== null && extraHours > duration + 0.001) {
    anomalies.push({
      type: 'extra_hours_exceed_shift',
      score: 80,
      reasons: [
        `El turno ${record.startTime}-${record.endTime} dura ${duration.toFixed(1)} h pero se declararon ${extraHours} h extras.`,
      ],
    });
  }

  if (duration !== null && duration < 1 && extraHours > 0) {
    anomalies.push({
      type: 'inconsistent_time_window',
      score: 70,
      reasons: ['La ventana de tiempo del turno es casi nula pero se declararon horas extras.'],
    });
  }

  if (monthTotalBefore + extraHours > monthlyCap) {
    anomalies.push({
      type: 'monthly_cap_exceeded',
      score: 60,
      reasons: [
        `Con este registro el mes acumularía ${(monthTotalBefore + extraHours).toFixed(1)} h extras, sobre el tope de ${monthlyCap} h.`,
      ],
    });
  }

  return anomalies;
}

export async function reviewRecord({ userId, recordId, record, monthRecords = null }) {
  try {
    const { AGENT_MAX_MONTHLY_EXTRA_HOURS } = getConfig();

    let records = monthRecords;
    if (!records) {
      const date = String(record.date ?? '');
      const [year, month] = date.split('-').map(Number);
      if (!year || !month) return [];
      const { findByMonth } = await import('../repositories/record.repository.js');
      records = await findByMonth(userId, year, month);
    }

    const monthTotalBefore = records
      .filter((r) => r.id !== recordId)
      .reduce((acc, r) => acc + Number(r.extra_hours || 0), 0);

    const anomalies = evaluateRecordRules(record, {
      monthTotalBefore,
      monthlyCap: AGENT_MAX_MONTHLY_EXTRA_HOURS,
    });

    await pool.query('DELETE FROM agent_anomalies WHERE record_id = $1', [recordId]);

    for (const anomaly of anomalies) {
      await pool.query(
        `INSERT INTO agent_anomalies (record_id, user_id, type, score, reasons)
         VALUES ($1, $2, $3, $4, $5)`,
        [recordId, userId, anomaly.type, anomaly.score, JSON.stringify(anomaly.reasons)]
      );
    }

    return anomalies;
  } catch (err) {
    logger.error('Anomaly review failed (non-blocking):', { message: err.message });
    return [];
  }
}

export async function enrichAnomalyWithLLM({ record, monthTotal, anomalies, abortSignal }) {
  if (!isAgentConfigured() || anomalies.length === 0) return anomalies;

  try {
    const { LLM_JSON_MODEL } = getConfig();
    const resolved = LLM_JSON_MODEL ? getAgentModelBySpec(LLM_JSON_MODEL) : null;
    if (!resolved) return anomalies;

    const { generateText } = await import('ai');

    const { text } = await generateText({
      model: resolved.model,
      system:
        'Eres un auditor de liquidaciones. Responde SOLO con un número entre 0 y 100 que represente la probabilidad de que el registro sea un error o fraude. 0 = normal, 100 = casi seguro fraudulento.',
      prompt: `Contexto: turno ${record.startTime}-${record.endTime} del ${record.date}, tipo ${record.dayType ?? record.day_type}, mes acumulado ${monthTotal} h extras antes de este registro.\nAnomalías detectadas por reglas: ${JSON.stringify(anomalies)}.\n¿Qué score final asignas?`,
      maxRetries: 1,
      maxOutputTokens: 500,
      abortSignal,
    });

    const parsed = Number(text.trim().match(/\d+/)?.[0]);
    if (!Number.isFinite(parsed)) return anomalies;
    const score = Math.min(100, Math.max(0, parsed));

    return anomalies.map((a) => ({ ...a, score, reasons: [...a.reasons, `Score ajustado por revisión IA.`] }));
  } catch (err) {
    logger.error('Anomaly LLM enrichment failed (non-blocking):', { message: err.message });
    return anomalies;
  }
}
