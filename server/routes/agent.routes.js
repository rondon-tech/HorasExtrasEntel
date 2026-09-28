import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.js';
import { requirePasswordChanged } from '../middlewares/password-change.js';
import { requireRole } from '../middlewares/role.js';
import { getConfig } from '../config/env.js';
import { agentMemory } from '../agents/memory.js';
import { logInvocation, getUsageSummary } from '../agents/telemetry.js';
import { extractExpenseFromImage } from '../agents/ocr.js';
import { generateGlobalMonthlyReport } from '../agents/reports.js';
import { runOpsDiagnosis } from '../agents/ops.js';
import { transcribeAndParseVoiceNote } from '../agents/voice.js';
import { assertBudget } from '../agents/budget.js';
import { isAgentConfigured, isGatewayConfigured } from '../agents/llm.js';
import { runAssistant, prepareChatContext } from '../agents/agents/assistant.js';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const router = Router();

const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Default IP-based key: this limiter runs before requireAuth, so req.user
  // is always undefined here. (A custom keyGenerator without the
  // ipKeyGenerator helper also trips express-rate-limit's IPv6 validation.)
  message: { error: 'Demasiadas consultas al asistente. Espera un minuto.' },
});

router.post('/chat', agentLimiter, requireAuth, requirePasswordChanged, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const message = String(req.body?.message ?? '').trim();

    if (!message || message.length > 2000) {
      return res.status(400).json({ error: 'Mensaje vacío o demasiado largo (máx. 2000 caracteres).' });
    }
    if (!isAgentConfigured()) {
      return res.status(503).json({ error: 'El asistente no está disponible en este momento.' });
    }

    let session = null;
    const requestedSessionId = req.body?.sessionId;
    if (requestedSessionId) {
      session = await agentMemory.getSession(requestedSessionId, userId);
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada.' });
      }
    } else {
      session = await agentMemory.createSession(userId, 'assistant', message.slice(0, 80));
    }

    await assertBudget(userId);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Agent-Session-Id', session.id);
    res.flushHeaders?.();

    const env = getConfig();
    const splitModels = (raw) => raw.split(',').map((m) => m.trim()).filter(Boolean);
    const candidates = [
      ...[env.LLM_MODEL, ...splitModels(env.LLM_FALLBACK_MODELS)].map((m) => ({ modelId: m, gateway: 'primary' })),
      ...(isGatewayConfigured('secondary')
        ? splitModels(env.LLM_SECONDARY_MODELS).map((m) => ({ modelId: m, gateway: 'secondary' }))
        : []),
      ...(isGatewayConfigured('ollama')
        ? splitModels(env.LLM_OLLAMA_MODELS).map((m) => ({ modelId: m, gateway: 'ollama' }))
        : []),
      ...(isGatewayConfigured('gemini')
        ? splitModels(env.LLM_GEMINI_MODELS).map((m) => ({ modelId: m, gateway: 'gemini' }))
        : []),
      ...(isGatewayConfigured('cerebras')
        ? splitModels(env.LLM_CEREBRAS_MODELS).map((m) => ({ modelId: m, gateway: 'cerebras' }))
        : []),
      ...(isGatewayConfigured('backup')
        ? splitModels(env.LLM_BACKUP_MODELS).map((m) => ({ modelId: m, gateway: 'backup' }))
        : []),
    ];

    const chatContext = await prepareChatContext({ userId, sessionId: session.id });

    let fullText = '';
    let usage = null;
    let lastError = null;
    const totalDeadline = Date.now() + Math.min(env.LLM_TOTAL_TIMEOUT_MS, env.LLM_MODEL_TIMEOUT_MS * 2);

    for (const { modelId, gateway } of candidates) {
      const remaining = totalDeadline - Date.now();
      if (remaining <= 3000) {
        logger.warn('Agent chain deadline exhausted', { triedModel: modelId });
        break;
      }

      let attemptText = '';
      let sentToClient = false;
      const attemptStart = Date.now();
      try {
        const result = await runAssistant({
          userId,
          sessionId: session.id,
          message,
          modelOverride: modelId,
          gateway,
          chatContext,
          abortSignal: AbortSignal.timeout(Math.min(env.LLM_MODEL_TIMEOUT_MS, remaining)),
        });
        for await (const delta of result.textStream) {
          if (attemptText.length === 0 && !delta.trim()) continue;
          attemptText += delta;
          if (!sentToClient) sentToClient = true;
          res.write(delta);
        }
        if (attemptText.trim()) {
          usage = await result.usage;
          fullText = attemptText;
          logInvocation({ userId, sessionId: session.id, gateway, model: modelId, status: 'ok', latencyMs: Date.now() - attemptStart, tokensIn: usage?.inputTokens ?? 0, tokensOut: usage?.outputTokens ?? 0, finishReason: result.finishReason });
          break;
        }
        logInvocation({ userId, sessionId: session.id, gateway, model: modelId, status: 'empty', latencyMs: Date.now() - attemptStart });
        logger.warn('Agent model produced empty output', { gateway, model: modelId });
      } catch (streamErr) {
        lastError = streamErr;
        logInvocation({ userId, sessionId: session.id, gateway, model: modelId, status: sentToClient ? 'aborted' : 'error', latencyMs: Date.now() - attemptStart, errorMessage: streamErr.message });
        logger.error('Agent stream failed', { gateway, model: modelId, sentToClient, message: streamErr.message });
        if (sentToClient) {
          fullText = attemptText;
          break;
        }
      }
    }

    try {
      if (!fullText.trim()) {
        res.write('\n[El asistente no pudo generar una respuesta en este momento. Los modelos gratuitos están saturados; inténtalo de nuevo en unos segundos.]');
        logger.error('Agent chat produced no output', { models: candidates.map((c) => c.modelId), lastError: lastError?.message });
        await agentMemory.saveMessage({ sessionId: session.id, role: 'user', content: message });
      } else {
        await agentMemory.saveMessage({ sessionId: session.id, role: 'user', content: message });
        await agentMemory.saveMessage({
          sessionId: session.id,
          role: 'assistant',
          content: fullText,
          tokensIn: usage?.inputTokens ?? 0,
          tokensOut: usage?.outputTokens ?? 0,
        });
      }
    } catch (persistErr) {
      logger.error('Agent persistence failed (non-blocking):', { message: persistErr.message });
    }

    res.end();
  } catch (err) {
    next(err);
  }
});

router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await agentMemory.listSessions(req.user.id);
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const session = await agentMemory.getSession(req.params.id, req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada.' });
    }
    const messages = await agentMemory.getHistory(req.params.id, 200);
    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
});

router.get('/anomalies', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, record_id, type, score, reasons, status, created_at
       FROM agent_anomalies WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});



router.get('/anomalies/all', requireAuth, requireRole('global_admin'), async (req, res, next) => {
  try {
    const status = ['open', 'reviewed', 'dismissed'].includes(req.query.status) ? req.query.status : null;
    const { rows } = await pool.query(
      `SELECT a.id, a.record_id, a.user_id, u.username, a.type, a.score, a.reasons, a.status, r.date::text AS record_date, r.start_time::text AS start_time, r.end_time::text AS end_time, r.extra_hours, r.sitio, r.tarea, a.created_at FROM agent_anomalies a JOIN users u ON u.id = a.user_id JOIN records r ON r.id = a.record_id WHERE ($1::text IS NULL OR a.status = $1) ORDER BY a.score DESC, a.created_at DESC LIMIT 200`,
      [status]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/anomalies/:id', requireAuth, requireRole('global_admin'), async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (!['open', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Use open, reviewed o dismissed.' });
    }
    const { rowCount } = await pool.query(
      `UPDATE agent_anomalies SET status = $1, reviewed_by = $2 WHERE id = $3`,
      [status, req.user.id, req.params.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Anomalía no encontrada.' });
    }
    res.json({ message: 'Anomalía actualizada' });
  } catch (err) {
    next(err);
  }
});

export { router as agentRouter };
router.get('/usage', requireAuth, requireRole('global_admin'), async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const summary = await getUsageSummary({ days });
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});


const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

router.post('/ocr', agentLimiter, requireAuth, requirePasswordChanged, async (req, res, next) => {
  try {
    const { imageBase64, mediaType } = req.body ?? {};
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      return res.status(400).json({ error: 'Imagen faltante o invalida.' });
    }
    const approxBytes = Math.floor((imageBase64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Imagen demasiado grande (max 4MB).' });
    }
    const media = ALLOWED_MEDIA.has(mediaType) ? mediaType : 'image/jpeg';

    const result = await extractExpenseFromImage({ imageBase64, mediaType: media });

    logInvocation({
      userId: req.user.id,
      agent: 'ocr',
      gateway: result.gateway || '-',
      model: result.model || '-',
      status: result.ok ? 'ok' : 'error',
      latencyMs: result.ms ?? null,
      errorMessage: result.ok ? null : (result.error || '').slice(0, 200),
    });

    if (!result.ok) {
      return res.status(503).json({ error: 'No se pudo procesar el ticket. Intentalo de nuevo en unos segundos.' });
    }

    res.json({ data: result.data, model: result.model, gateway: result.gateway, ms: result.ms });
  } catch (err) {
    next(err);
  }
});


router.post('/reports/monthly', requireAuth, requireRole('global_admin'), async (req, res, next) => {
  try {
    const now = new Date();
    const year = Math.min(Math.max(Number(req.body?.year) || now.getFullYear(), 2020), 2100);
    const month = Math.min(Math.max(Number(req.body?.month) || now.getMonth() + 1, 1), 12);

    const result = await generateGlobalMonthlyReport({ year, month, requesterId: req.user.id });

    if (!result.ok) {
      return res.status(503).json({ error: result.error });
    }

    res.json({ data: { report: result.report, model: result.model, gateway: result.gateway, ms: result.ms } });
  } catch (err) {
    next(err);
  }
});


router.post('/ops/diagnosis', requireAuth, requireRole('global_admin'), async (req, res, next) => {
  try {
    const result = await runOpsDiagnosis({ requesterId: req.user.id });
    if (!result.ok) {
      return res.status(503).json({ error: result.error, data: result.data || null });
    }
    res.json({ data: { diagnosis: result.diagnosis, raw: result.data, model: result.model, gateway: result.gateway, ms: result.ms } });
  } catch (err) {
    next(err);
  }
});

const MAX_AUDIO_B64 = 14 * 1024 * 1024;

router.post('/voice', agentLimiter, requireAuth, requirePasswordChanged, async (req, res, next) => {
  try {
    const { audioBase64, mediaType } = req.body ?? {};
    if (!audioBase64 || typeof audioBase64 !== 'string' || audioBase64.length < 100) {
      return res.status(400).json({ error: 'Audio faltante o invalido.' });
    }
    if (audioBase64.length > MAX_AUDIO_B64) {
      return res.status(413).json({ error: 'Audio demasiado largo (max 10MB).' });
    }
    const media = typeof mediaType === 'string' && mediaType.startsWith('audio/') ? mediaType : 'audio/webm';

    const result = await transcribeAndParseVoiceNote({
      audioBase64,
      mediaType: media,
      userId: req.user.id,
    });

    if (!result.ok) {
      return res.status(503).json({ error: result.error });
    }

    res.json({ data: result.data, transcription: result.transcription, model: result.model, ms: result.ms });
  } catch (err) {
    next(err);
  }
});

