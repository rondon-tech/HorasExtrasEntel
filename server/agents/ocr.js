import { generateText } from 'ai';
import { z } from 'zod';
import { getConfig } from '../config/env.js';
import { isAgentConfigured, getAgentModelBySpec, isGatewayConfigured, getAgentModel } from './llm.js';
import { logger } from '../utils/logger.js';

const OCR_SCHEMA = z.object({
  total: z.number().min(0).max(50000000).nullable(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  nemonico: z.enum(['VIA', 'MOV', 'EST', 'OTR']).nullable(),
  proveedor: z.string().max(80).nullable(),
}).partial();

const VISION_CHAIN_TIMEOUT_MS = 30000;

const OCR_SYSTEM_PROMPT = `Eres el agente OCR de la aplicacion "Entel Horas Extras" (Entel Chile).
Recibiras la foto de un ticket o boleta de gasto de un tecnico de campo.
Extrae los datos y responde EXCLUSIVAMENTE con un JSON valido, sin markdown ni texto extra, con este formato:
{"total": <numero en CLP sin puntos ni simbolos, null si no se ve>, "fecha": "<YYYY-MM-DD o null>", "nemonico": "<uno de: VIA (viatico/movil), MOV (movil/transporte), EST (estacionamiento), OTR (otro) o null>", "proveedor": "<nombre del local/emisor o null>"}
Reglas:
- El total es el monto final pagado en pesos chilenos. Si hay varios, usa el TOTAL.
- La fecha si aparece; si no, null.
- Nunca inventes datos que no se vean en la imagen.`;

function parseOcrOutput(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return OCR_SCHEMA.parse(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

function parseSpecList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Runs OCR against the vision model chain (primary -> fallbacks).
 * Returns { ok, data, model, gateway, ms } — never throws.
 */
export async function extractExpenseFromImage({ imageBase64, mediaType = 'image/jpeg' }) {
  if (!isAgentConfigured()) {
    return { ok: false, error: 'OCR no configurado (falta LLM_API_KEY).' };
  }

  const env = getConfig();
  const chain = [];
  if (env.LLM_VISION_MODEL) chain.push(env.LLM_VISION_MODEL);
  for (const spec of parseSpecList(env.LLM_VISION_FALLBACK_MODELS)) chain.push(spec);

  const message = {
    role: 'user',
    content: [
      { type: 'text', text: 'Extrae los datos de este ticket y responde solo el JSON.' },
      { type: 'image', image: imageBase64, mediaType },
    ],
  };

  let lastError = null;
  for (const spec of chain) {
    const resolved = getAgentModelBySpec(spec);
    if (!resolved) continue;
    const t0 = Date.now();
    try {
      const { text } = await generateText({
        model: resolved.model,
        system: OCR_SYSTEM_PROMPT,
        messages: [message],
        maxRetries: 1,
        maxOutputTokens: 800,
        abortSignal: AbortSignal.timeout(VISION_CHAIN_TIMEOUT_MS),
      });
      const data = parseOcrOutput(text);
      if (data) {
        return { ok: true, data, model: resolved.modelId, gateway: resolved.gateway, ms: Date.now() - t0 };
      }
      logger.warn('OCR model produced unparseable output', { gateway: resolved.gateway, model: resolved.modelId });
    } catch (err) {
      lastError = err;
      logger.error('OCR model failed', { gateway: resolved.gateway, model: resolved.modelId, message: err.message });
    }
  }

  return { ok: false, error: lastError?.message || 'Ningun modelo de vision disponible.' };
}
