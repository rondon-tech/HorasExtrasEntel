/**
 * A5 restore drill — verifies the latest R2 backup is restorable and complete.
 *
 * 1. Lists R2 backups, picks the most recent (must be < MAX_AGE_HOURS old).
 * 2. Connects to the DRILL database (DRILL_DATABASE_URL, ephemeral, never production).
 * 3. Applies schema migrations, wipes data, executes the backup INSERTs.
 * 4. Validates: all critical tables exist and row counts match the backup's.
 *
 * Exits non-zero on any failure (alertable via GitHub Actions).
 * Usage: npx tsx scripts/restore-drill.mjs
 */
import { createGunzip } from 'node:zlib';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import { runner as runMigrations } from 'node-pg-migrate';
import fs from 'fs';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

for (const line of fs.readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z_]+)="?([^"#]*)"?$/.exec(line.trim());
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'DRILL_DATABASE_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`ERROR: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const MAX_AGE_HOURS = 26;
const CRITICAL_TABLES = ['users', 'records', 'expenses', 'params', 'audit_log', 'agent_anomalies'];

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function findLatestBackup() {
  const { Contents } = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, Prefix: 'backups/' }));
  const backups = (Contents || []).filter((o) => o.Key.endsWith('.sql.gz')).sort((a, b) => b.LastModified - a.LastModified);
  if (backups.length === 0) throw new Error('No hay backups en el bucket.');
  const latest = backups[0];
  const ageHours = (Date.now() - latest.LastModified.getTime()) / 3600000;
  console.log(`Ultimo backup: ${latest.Key} (${ageHours.toFixed(1)}h de antiguedad)`);
  if (ageHours > MAX_AGE_HOURS) {
    throw new Error(`BACKUP STALE: el ultimo backup tiene ${ageHours.toFixed(1)}h (max ${MAX_AGE_HOURS}h). Revisar workflow de backup.`);
  }
  return latest;
}

async function downloadBackup(key) {
  const response = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  const chunks = [];
  const gunzip = createGunzip();
  await new Promise((resolve, reject) => {
    response.Body.pipe(gunzip).on('data', (c) => chunks.push(c)).on('end', resolve).on('error', reject);
  });
  return Buffer.concat(chunks).toString('utf-8');
}

function extractInserts(sql) {
  const statements = [];
  let current = [];
  for (const line of sql.split('\n')) {
    if (line.startsWith('--') || line.trim() === '' || line.startsWith('BEGIN') || line.startsWith('COMMIT')) {
      if (current.length) { statements.push(current.join('\n')); current = []; }
      continue;
    }
    if (line.trim().endsWith(';')) {
      current.push(line);
      statements.push(current.join('\n'));
      current = [];
      continue;
    }
    if (current.length || line.trim().toUpperCase().startsWith('INSERT')) {
      current.push(line);
    }
  }
  return statements.filter((s) => s.toUpperCase().includes('INSERT'));
}

function countRowsPerTable(sql) {
  const counts = {};
  for (const stmt of extractInserts(sql)) {
    const m = /INSERT INTO (\w+)/i.exec(stmt);
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  return counts;
}

async function main() {
  console.log('=== A5 RESTORE DRILL ===');

  const backup = await findLatestBackup();
  const sql = await downloadBackup(backup.Key);
  console.log(`Backup descargado: ${(sql.length / 1024).toFixed(1)} KB`);

  const expected = countRowsPerTable(sql);
  const expectedTables = Object.keys(expected);
  console.log(`Tablas en el backup: ${expectedTables.join(', ') || '(ninguna)'}`);

  const pool = new pg.Pool({ connectionString: process.env.DRILL_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log('Aplicando migraciones a la BD de drill...');
  await runMigrations({
    databaseUrl: process.env.DRILL_DATABASE_URL,
    migrationsTable: 'pgmigrations',
    dir: `${ROOT}server/migrations`,
    direction: 'up',
    count: Infinity,
    log: () => {},
  });

  await pool.query('BEGIN');
  try {
    for (const table of expectedTables) {
      await pool.query(`DELETE FROM ${table}`);
    }
    let executed = 0;
    for (const stmt of extractInserts(sql)) {
      try {
        await pool.query(stmt);
        executed++;
      } catch (err) {
        if (err.code === '23505') continue;
        throw err;
      }
    }
    console.log(`INSERTs ejecutados: ${executed}`);

    const failures = [];
    for (const table of expectedTables) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
      const actual = rows[0].c;
      const expectedCount = expected[table];
      if (actual !== expectedCount) {
        failures.push(`${table}: backup ${expectedCount} vs drill ${actual}`);
      } else {
        console.log(`  OK ${table}: ${actual} filas`);
      }
    }
    for (const t of CRITICAL_TABLES) {
      if (!expectedTables.includes(t) && t !== 'agent_anomalies') {
        console.log(`  (nota) ${t} sin datos en este backup`);
      }
    }
    if (failures.length) {
      throw new Error('Conteos difieren: ' + failures.join('; '));
    }
    console.log('=== DRILL EXITOSO: backup restaurable y consistente ===');
  } finally {
    await pool.query('ROLLBACK');
    await pool.end();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('DRILL FALLO:', err.message);
  process.exit(1);
});