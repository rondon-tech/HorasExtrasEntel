import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getConfig } from '../config/env.js';

const cachedModels = new Map();

const TIER_FIELDS = {
  primary: { baseUrl: 'LLM_BASE_URL', key: 'LLM_API_KEY', auth: 'LLM_AUTH_HEADER' },
  secondary: { baseUrl: 'LLM_SECONDARY_BASE_URL', key: 'LLM_SECONDARY_API_KEY', auth: 'LLM_SECONDARY_AUTH_HEADER' },
  ollama: { baseUrl: 'LLM_OLLAMA_BASE_URL', key: 'LLM_OLLAMA_API_KEY', auth: 'LLM_OLLAMA_AUTH_HEADER' },
  cerebras: { baseUrl: 'LLM_CEREBRAS_BASE_URL', key: 'LLM_CEREBRAS_API_KEY', auth: 'LLM_CEREBRAS_AUTH_HEADER' },
  gemini: { baseUrl: 'LLM_GEMINI_BASE_URL', key: 'LLM_GEMINI_API_KEY', auth: 'LLM_GEMINI_AUTH_HEADER' },
  backup: { baseUrl: 'LLM_BACKUP_BASE_URL', key: 'LLM_BACKUP_API_KEY', auth: 'LLM_BACKUP_AUTH_HEADER' },
};

export function isAgentConfigured() {
  const { LLM_API_KEY } = getConfig();
  return Boolean(LLM_API_KEY);
}

export function isGatewayConfigured(tier) {
  const fields = TIER_FIELDS[tier];
  if (!fields) return false;
  const cfg = getConfig();
  return Boolean(cfg[fields.baseUrl] && cfg[fields.key]);
}

export function isBackupGatewayConfigured() {
  return isGatewayConfigured('backup');
}

function buildModel(tier, modelId) {
  const fields = TIER_FIELDS[tier];
  const cfg = getConfig();
  const baseUrl = cfg[fields.baseUrl];
  const apiKey = cfg[fields.key];
  const authHeader = cfg[fields.auth];

  if (!baseUrl || !apiKey) {
    const err = new Error(`Gateway '${tier}' del agente no configurado (falta API key o base URL).`);
    err.status = 503;
    throw err;
  }

  const headers = {};
  if (authHeader === 'Authorization') {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers[authHeader] = apiKey;
  }

  const provider = createOpenAICompatible({
    name: `agent-llm-${tier}`,
    baseURL: baseUrl,
    headers,
  });

  return provider(modelId);
}

export function getAgentModel(modelId, gateway = 'primary') {
  if (!modelId) {
    const { LLM_MODEL } = getConfig();
    modelId = LLM_MODEL;
  }

  const cacheKey = `${gateway}:${modelId}`;
  if (cachedModels.has(cacheKey)) return cachedModels.get(cacheKey);

  const model = buildModel(gateway, modelId);
  cachedModels.set(cacheKey, model);
  return model;
}

/**
 * Resolves a per-agent model spec: 'model-id' (primary gateway) or
 * 'secondary:model-id' / 'backup:model-id'. Returns { model, gateway, modelId }
 * or null when the tier is not configured.
 */
export function getAgentModelBySpec(spec) {
  const trimmed = String(spec || '').trim();
  if (!trimmed) return null;
  for (const tier of Object.keys(TIER_FIELDS)) {
    if (trimmed.startsWith(`${tier}:`)) {
      if (!isGatewayConfigured(tier)) return null;
      const modelId = trimmed.slice(tier.length + 1);
      return { model: getAgentModel(modelId, tier), gateway: tier, modelId };
    }
  }
  return { model: getAgentModel(trimmed, 'primary'), gateway: 'primary', modelId: trimmed };
}
