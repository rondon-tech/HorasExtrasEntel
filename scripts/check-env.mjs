/**
 * Verifica las variables de entorno requeridas desde .env
 * y genera un checklist para configurar en Vercel.
 *
 * Uso: node scripts/check-env.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const content = readFileSync(envPath, 'utf-8');

// Required env vars (from server/config/env.ts)
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ADMIN_USER',
  'ADMIN_PASSWORD',
  'FRONTEND_URL',
];

// Optional env vars
const optionalVars = [
  'DATABASE_URL_FALLBACK',
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
];

function mask(value) {
  if (!value) return '(vacio)';
  if (value.length <= 8) return value[0] + '***';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

// Parse .env
const envVars = {};
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();
  // Remove surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  envVars[key] = value;
}

console.log('');
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│  VERIFICACIÓN DE VARIABLES DE ENTORNO                       │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Archivo: .env                                              │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Variable              │ Valor                              │');
console.log('├─────────────────────────────────────────────────────────────┤');
for (const key of [...requiredVars, ...optionalVars]) {
  const value = envVars[key];
  const status = value ? mask(value) : '❌ NO CONFIGURADO';
  console.log(`│  ${key.padEnd(22)}│ ${status.padEnd(34)}│`);
}
console.log('└─────────────────────────────────────────────────────────────┘');
console.log('');
console.log('PARA CONFIGURAR EN VERCEL (Project Settings → Environment Variables):');
console.log('');
for (const key of requiredVars) {
  const value = envVars[key];
  if (value) {
    console.log(`  ${key}=${mask(value)}`);
    console.log(`    → Production, Preview, Development`);
    console.log('');
  }
}
