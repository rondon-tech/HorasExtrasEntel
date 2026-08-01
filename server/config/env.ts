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
