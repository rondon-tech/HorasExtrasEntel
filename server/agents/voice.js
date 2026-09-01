import { generateText } from 'ai';
import { z } from 'zod';
import { getConfig } from '../config/env.js';
import { isAgentConfigured, getAgentModelBySpec } from './llm.js';
import { logInvocation } from './telemetry.js';
import { logger } from '../utils/logger.js';

const TRANSCRIBE_TIMEOUT_MS = 60000;
const PARSE_TIMEOUT_MS = 20000;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const VOICE_PARSE_SCHEMA = z.object({
  sitio: z.string().max(100).nullable(),
  tarea: z.string().max(200).nullable(),
  numeroTarea: z.string().max(50).nullable(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  dayType: z.enum(['Normal', 'TAD', 'TAD Apoyo']).nullable(),
  isFeriado: z.boolean().nullable(),
  isContingencia: z.boolean().nullable(),
});

const PARSE_SYSTEM_PROMPT = `Eres el extractor de datos del agente de voz de "Entel Horas Extras".
Recibiras la transcripcion de lo que dijo un tecnico de campo sobre su jornada de trabajo.
Extrae los campos y responde EXCLUSIVAMENTE con JSON valido:
{"sitio": "<lugar o null>", "tarea": "<descripcion breve o null>", "numeroTarea": "<codigo o null>", "startTime": "HH:MM o null", "endTime": "HH:MM o null", "dayType": "Normal|TAD|TAD Apoyo o null", "isFeriado": true/false/null, "isContingencia": true/false/null}
Reglas:
- Horas en formato 24h HH:MM (ej: "siete y media" -> "07:30", "a las 22" -> "22:00").
- "TAD" o "disponibilidad" -> dayType "TAD"; "TAD apoyo" -> "TAD Apoyo"; si no menciona -> "Normal".
- Feriado/contingencia solo si el tecnico lo dice explicitamente; si no, null.
- Nunca inventes datos que no esten en la transcripcion.`;

async function transcribeWithGroq(audioBase64, mediaType) {
  const { LLM_API_KEY, LLM_BASE_URL } = getConfig();
  if (!LLM_API_KEY || !LLM_BASE_URL.includes('groq')) {
    return { ok: false, error: 'La transcripcion requiere Groq como gateway primario.' };
  }

  const mimeToExt = { 'audio/webm': 'webm', 'audio/webm;codecs=opus': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg' };
  const ext = mimeToExt[mediaType] || 'webm';
  const buffer = Buffer.from(audioBase64, 'base64');

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mediaType.split(';')[0] }), `audio.${ext}`);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'es');
  form.append('response_format', 'json');

  const t0 = Date.now();
  try {
    const res = await fetch(`${LLM_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LLM_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
    });
    if (!res.ok) {
      const errText = (await res.text()).slice(0, 200);
      return { ok: false, error: `Whisper ${res.status}: ${errText}` };
    }
    const data = await res.json();
    return { ok: true, text: data.text, ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, error: `Whisper falló: ${err.message}` };
  }
}

export async function transcribeAndParseVoiceNote({ audioBase64, mediaType, userId }) {
  if (!isAgentConfigured()) {
    return { ok: false, error: 'Agentes no configurados.' };
  }
  if (audioBase64.length * 0.75 > MAX_AUDIO_BYTES) {
    return { ok: false, error: 'Audio demasiado largo (max 10MB).' };
  }

  const transcription = await transcribeWithGroq(audioBase64, mediaType);
  logInvocation({
    userId,
    agent: 'voice',
    gateway: 'primary',
    model: 'whisper-large-v3-turbo',
    status: transcription.ok ? 'ok' : 'error',
    latencyMs: transcription.ms ?? null,
    errorMessage: transcription.ok ? null : transcription.error,
  });
  if (!transcription.ok) {
    return transcription;
  }

  const env = getConfig();
  const resolved = env.LLM_JSON_MODEL ? getAgentModelBySpec(env.LLM_JSON_MODEL) : null;
  if (!resolved) {
    return { ok: true, transcription: transcription.text, data: null, model: null };
  }

  const t0 = Date.now();
  try {
    const { text } = await generateText({
      model: resolved.model,
      system: PARSE_SYSTEM_PROMPT,
      prompt: 'Transcripcion:\n"' + transcription.text + '"',
      maxRetries: 1,
      maxOutputTokens: 400,
      abortSignal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
    });

    const match = text.match(/\{[\s\S]*\}/);
    let data = null;
    if (match) {
      try { data = VOICE_PARSE_SCHEMA.parse(JSON.parse(match[0])); } catch {}
    }

    logInvocation({
      userId,
      agent: 'voice-parse',
      gateway: resolved.gateway,
      model: resolved.modelId,
      status: data ? 'ok' : 'empty',
      latencyMs: Date.now() - t0,
    });

    return { ok: true, transcription: transcription.text, data, model: resolved.modelId, ms: transcription.ms + (Date.now() - t0) };
  } catch (err) {
    logger.error('Voice parse failed', { message: err.message });
    return { ok: true, transcription: transcription.text, data: null, error: 'No se pudo estructurar el dictado.' };
  }
}