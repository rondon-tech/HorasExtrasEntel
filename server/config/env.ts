/**
 * Centralized environment configuration with TypeScript type safety.
 *
 * Validates required environment variables at startup and exports a typed `env`
 * object. The process exits with a clear error if any critical variable is
 * missing, so we never run with insecure fallbacks.
 */

import dotenv from 'dotenv';

// Load .env BEFORE anything else reads process.env.
dotenv.config();

export interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  ADMIN_USER: string;
  ADMIN_PASSWORD: string;
  PORT: number;
  FRONTEND_URL: string;
  NODE_ENV: string;
  LOG_LEVEL: string;
  isProduction: boolean;
  isVercel: boolean;
  LLM_API_KEY: string;
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  LLM_AUTH_HEADER: string;
  LLM_FALLBACK_MODELS: string;
  LLM_SECONDARY_BASE_URL: string;
  LLM_SECONDARY_API_KEY: string;
  LLM_SECONDARY_AUTH_HEADER: string;
  LLM_SECONDARY_MODELS: string;
  LLM_OLLAMA_BASE_URL: string;
  LLM_OLLAMA_API_KEY: string;
  LLM_OLLAMA_AUTH_HEADER: string;
  LLM_OLLAMA_MODELS: string;
  LLM_CEREBRAS_BASE_URL: string;
  LLM_CEREBRAS_API_KEY: string;
  LLM_CEREBRAS_AUTH_HEADER: string;
  LLM_CEREBRAS_MODELS: string;
  LLM_GEMINI_BASE_URL: string;
  LLM_GEMINI_API_KEY: string;
  LLM_GEMINI_AUTH_HEADER: string;
  LLM_GEMINI_MODELS: string;
  LLM_BACKUP_BASE_URL: string;
  LLM_BACKUP_API_KEY: string;
  LLM_BACKUP_AUTH_HEADER: string;
  LLM_BACKUP_MODELS: string;
  LLM_MODEL_TIMEOUT_MS: number;
  LLM_TOTAL_TIMEOUT_MS: number;
  LLM_JSON_MODEL: string;
  LLM_VISION_MODEL: string;
  LLM_VISION_FALLBACK_MODELS: string;
  LLM_REPORT_MODEL: string;
  AGENT_DAILY_TOKEN_BUDGET: number;
  AGENT_MAX_MONTHLY_EXTRA_HOURS: number;
  SENTRY_DSN: string;
}

function getRequired(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Copy .env.example to .env (or configure it in your host) and provide a strong value.`
    );
  }
  return value;
}

function getOptional(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? defaultValue : value;
}

function getBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

function buildConfig(): EnvConfig {
  const nodeEnv = getOptional('NODE_ENV', 'development');
  return {
    DATABASE_URL: getRequired('DATABASE_URL'),
    JWT_SECRET: getRequired('JWT_SECRET'),
    ADMIN_USER: getRequired('ADMIN_USER'),
    ADMIN_PASSWORD: getRequired('ADMIN_PASSWORD'),
    PORT: Number(getOptional('PORT', '3001')),
    FRONTEND_URL: getOptional('FRONTEND_URL', ''),
    NODE_ENV: nodeEnv,
    LOG_LEVEL: getOptional('LOG_LEVEL', 'info'),
    isProduction: nodeEnv === 'production',
    isVercel: getBoolean('VERCEL', false),
    LLM_API_KEY: getOptional('LLM_API_KEY', ''),
    LLM_BASE_URL: getOptional('LLM_BASE_URL', 'https://api.z.ai/api/paas/v4'),
    LLM_MODEL: getOptional('LLM_MODEL', 'glm-5.3-flash'),
    LLM_AUTH_HEADER: getOptional('LLM_AUTH_HEADER', 'Authorization'),
    LLM_FALLBACK_MODELS: getOptional('LLM_FALLBACK_MODELS', ''),
    LLM_SECONDARY_BASE_URL: getOptional('LLM_SECONDARY_BASE_URL', ''),
    LLM_SECONDARY_API_KEY: getOptional('LLM_SECONDARY_API_KEY', ''),
    LLM_SECONDARY_AUTH_HEADER: getOptional('LLM_SECONDARY_AUTH_HEADER', 'Authorization'),
    LLM_SECONDARY_MODELS: getOptional('LLM_SECONDARY_MODELS', ''),
    LLM_OLLAMA_BASE_URL: getOptional('LLM_OLLAMA_BASE_URL', ''),
    LLM_OLLAMA_API_KEY: getOptional('LLM_OLLAMA_API_KEY', ''),
    LLM_OLLAMA_AUTH_HEADER: getOptional('LLM_OLLAMA_AUTH_HEADER', 'Authorization'),
    LLM_OLLAMA_MODELS: getOptional('LLM_OLLAMA_MODELS', ''),
    LLM_CEREBRAS_BASE_URL: getOptional('LLM_CEREBRAS_BASE_URL', ''),
    LLM_CEREBRAS_API_KEY: getOptional('LLM_CEREBRAS_API_KEY', ''),
    LLM_CEREBRAS_AUTH_HEADER: getOptional('LLM_CEREBRAS_AUTH_HEADER', 'Authorization'),
    LLM_CEREBRAS_MODELS: getOptional('LLM_CEREBRAS_MODELS', ''),
    LLM_GEMINI_BASE_URL: getOptional('LLM_GEMINI_BASE_URL', ''),
    LLM_GEMINI_API_KEY: getOptional('LLM_GEMINI_API_KEY', ''),
    LLM_GEMINI_AUTH_HEADER: getOptional('LLM_GEMINI_AUTH_HEADER', 'Authorization'),
    LLM_GEMINI_MODELS: getOptional('LLM_GEMINI_MODELS', ''),
    LLM_BACKUP_BASE_URL: getOptional('LLM_BACKUP_BASE_URL', ''),
    LLM_BACKUP_API_KEY: getOptional('LLM_BACKUP_API_KEY', ''),
    LLM_BACKUP_AUTH_HEADER: getOptional('LLM_BACKUP_AUTH_HEADER', 'Authorization'),
    LLM_BACKUP_MODELS: getOptional('LLM_BACKUP_MODELS', ''),
    LLM_MODEL_TIMEOUT_MS: Number(getOptional('LLM_MODEL_TIMEOUT_MS', '45000')),
    LLM_TOTAL_TIMEOUT_MS: Number(getOptional('LLM_TOTAL_TIMEOUT_MS', '50000')),
    LLM_JSON_MODEL: getOptional('LLM_JSON_MODEL', ''),
    LLM_VISION_MODEL: getOptional('LLM_VISION_MODEL', ''),
    LLM_VISION_FALLBACK_MODELS: getOptional('LLM_VISION_FALLBACK_MODELS', ''),
    LLM_REPORT_MODEL: getOptional('LLM_REPORT_MODEL', ''),
    AGENT_DAILY_TOKEN_BUDGET: Number(getOptional('AGENT_DAILY_TOKEN_BUDGET', '200000')),
    AGENT_MAX_MONTHLY_EXTRA_HOURS: Number(getOptional('AGENT_MAX_MONTHLY_EXTRA_HOURS', '60')),
    SENTRY_DSN: getOptional('SENTRY_DSN', ''),
  };
}

let cachedConfig: EnvConfig | null = null;

/**
 * Returns the validated environment configuration.
 * Throws on first call if a required variable is missing.
 * Subsequent calls return the cached config.
 */
export function getConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = buildConfig();
  return cachedConfig;
}
