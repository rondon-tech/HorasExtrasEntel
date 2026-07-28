/**
 * Anomaly Detection Script for Entel Horas Extras
 *
 * Analyzes records for unusual patterns:
 *  - Hours above 2σ from the monthly mean
 *  - Exact duplicate task numbers across different dates
 *  - Days with unusually high consecutive extra hours
 *
 * Usage:  node scripts/detect-anomalies.mjs [year] [month]
 *         Defaults to current month.
 */

import dotenv from 'dotenv';
import { getConfig } from '../api/config/env.js';

dotenv.config();
const env = getConfig();

// Dynamic import for pg (ESM)
const pg = await import('pg');
const { Pool } = pg.default;
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.isProduction ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
});

const year = parseInt(process.argv[2]) || new Date().getFullYear();
const month = parseInt(process.argv[3]) || (new Date().getMonth() + 1);

console.log(`\n=== Detección de Anomalías — ${year}-${String(month).padStart(2, '0')} ===\n`);

// 1. Fetch records for the month
const { rows } = await pool.query(
  `SELECT *, EXTRACT(HOUR FROM (end_time - start_time)) AS worked_hours
   FROM records
   WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
   ORDER BY date`,
  [year, month]
);

if (rows.length === 0) {
  console.log('Sin registros para este mes.');
  process.exit(0);
}

// 2. Statistical analysis
const hours = rows.map(r => Number(r.extra_hours)).filter(h => h > 0);
const mean = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
const variance = hours.length
  ? hours.reduce((sum, h) => sum + (h - mean) ** 2, 0) / hours.length
  : 0;
const stdDev = Math.sqrt(variance);

console.log(`Total registros: ${rows.length}`);
console.log(`Horas extras promedio: ${mean.toFixed(2)} hrs`);
console.log(`Desviación estándar: ${stdDev.toFixed(2)} hrs`);
console.log(`Umbral de anomalía (> μ + 2σ): ${(mean + 2 * stdDev).toFixed(2)} hrs\n`);

// 3. Flag anomalies
let anomalyCount = 0;

// 3a. Unusually high hours (> 2σ above mean)
const highThreshold = mean + 2 * stdDev;
rows.forEach(r => {
  if (Number(r.extra_hours) > highThreshold && highThreshold > 0) {
    console.log(`⚠️  Horas altas: ${r.date.toISOString().slice(0, 10)} — ${Number(r.extra_hours).toFixed(1)} hrs (${r.sitio}, ${r.tarea})`);
    anomalyCount++;
  }
});

// 3b. Duplicate task numbers on different dates
const taskMap = new Map();
rows.forEach(r => {
  if (!r.numero_tarea || r.numero_tarea === '-') return;
  const key = r.numero_tarea;
  if (!taskMap.has(key)) taskMap.set(key, []);
  taskMap.get(key).push(r.date.toISOString().slice(0, 10));
});
taskMap.forEach((dates, taskNum) => {
  if (dates.length > 1) {
    console.log(`⚠️  Tarea duplicada: N° ${taskNum} aparece en ${dates.length} fechas: ${dates.join(', ')}`);
    anomalyCount++;
  }
});

// 3c. Days with consecutive hours > 8
rows.forEach(r => {
  if (Number(r.extra_hours) > 8) {
    console.log(`⚠️  Jornada extendida: ${r.date.toISOString().slice(0, 10)} — ${Number(r.extra_hours).toFixed(1)} hrs extras`);
    anomalyCount++;
  }
});

console.log(`\n${anomalyCount > 0 ? `⚠️  ${anomalyCount} anomalías detectadas.` : '✅ Sin anomalías detectadas.'}\n`);

await pool.end();
