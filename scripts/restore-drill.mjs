/**
 * A5 restore drill — proves the latest R2 backup is restorable and complete.
 *
 * 1. Latest backup must exist and be fresh (< MAX_AGE_HOURS old).
 * 2. SHA-256 verified against manifest; AES-256-GCM decrypted.
 * 3. Schema migrations applied to the drill DB, then pg_restore --clean.
 * 4. Validates: row counts match manifest, critical tables exist,
 *    users table non-empty, every JSON/JSONB value is structurally valid
 *    (catches the "[object Object]" corruption class at restore time).
 *
 * Safety: refuses to run unless DRILL_CONFIRM_NOT_PRODUCTION=1, so a
 * misconfigured DRILL_DATABASE_URL can never wipe production.
 *
 * Exits non-zero on any failure (alertable via GitHub Actions).
 * Usage: npx tsx scripts/restore-drill.mjs
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { runner as runMigrations } from 'node-pg-migrate';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import {
  decryptBuffer,
  downloadObject,
  findLatestBackup,
  getEncryptionKey,
  getRowCounts,
  maskDbUrl,
  pgSsl,
  r2Client,
  requireEnv,
  runCmd,
  sha256Hex,
  withSsl,
} from './lib/backup-common.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
dotenv.config({ path: `${ROOT}.env` });

const MAX_AGE_HOURS = 26;
const CRITICAL_TABLES = ['users', 'records', 'expenses', 'params', 'audit_log'];

async function checkJsonColumns(pool) {
  const { rows: cols } = await pool.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type IN ('json', 'jsonb')
  `);
  const failures = [];
  for (const { table_name, column_name } of cols) {
    // A corrupt dump (e.g. JS "[object Object]" stringified into JSON)
    // shows up here as a literal '[object Object]' text value.
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total,
              SUM(CASE WHEN "${column_name}"::text = '[object Object]' THEN 1 ELSE 0 END)::int AS corrupt
       FROM "${table_name}" WHERE "${column_name}" IS NOT NULL`,
    );
    console.log(`  JSON probe ${table_name}.${column_name}: ${rows[0].total} values, ${rows[0].corrupt} corrupt`);
    if (rows[0].corrupt > 0) failures.push(`${table_name}.${column_name}: ${rows[0].corrupt} corrupt JSON values`);
  }
  return failures;
}

async function main() {
  console.log('=== A5 RESTORE DRILL ===');

  if (process.env.DRILL_CONFIRM_NOT_PRODUCTION !== '1') {
    console.error('ERROR: Refusing to run without DRILL_CONFIRM_NOT_PRODUCTION=1.');
    console.error('This guard prevents wiping production if DRILL_DATABASE_URL is misconfigured.');
    process.exit(1);
  }

  const bucket = requireEnv('R2_BUCKET');
  const drillUrl = withSsl(requireEnv('DRILL_DATABASE_URL'));
  const key = getEncryptionKey();
  const r2 = r2Client();

  console.log(`  Drill DB: ${maskDbUrl(drillUrl)}`);

  const backup = await findLatestBackup(r2, bucket);
  const ageHours = (Date.now() - backup.lastModified.getTime()) / 3600000;
  console.log(`  Latest backup: ${backup.key} (${ageHours.toFixed(1)}h old)`);
  if (ageHours > MAX_AGE_HOURS) {
    throw new Error(`BACKUP STALE: latest backup is ${ageHours.toFixed(1)}h old (max ${MAX_AGE_HOURS}h). Check backup workflow.`);
  }

  const [blob, manifestRaw] = await Promise.all([
    downloadObject(r2, bucket, backup.key),
    downloadObject(r2, bucket, backup.manifestKey),
  ]);
  const manifest = JSON.parse(manifestRaw.toString('utf-8'));
  if (sha256Hex(blob) !== manifest.sha256) {
    throw new Error('Digest mismatch — backup corrupt. Aborting drill.');
  }
  console.log('  Digest OK.');
  const dump = decryptBuffer(blob, key);
  console.log(`  Decrypted ${(dump.length / 1024).toFixed(1)} KB.`);

  const { Pool } = pg;
  const pool = new Pool({ connectionString: drillUrl, ssl: pgSsl() });
  const workdir = mkdtempSync(join(tmpdir(), 'hhee-drill-'));

  try {
    console.log('Applying migrations to drill DB...');
    await runMigrations({
      databaseUrl: drillUrl,
      migrationsTable: 'pgmigrations',
      dir: `${ROOT}server/migrations`,
      direction: 'up',
      count: Infinity,
      log: () => {},
    });

    const dumpFile = join(workdir, 'backup.dump');
    writeFileSync(dumpFile, dump);

    console.log('Restoring into drill DB (pg_restore --clean)...');
    await runCmd('pg_restore', [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      `--dbname=${drillUrl}`,
      dumpFile,
    ]);

    console.log('Verifying row counts against manifest...');
    const actual = await getRowCounts(pool);
    const failures = [];
    for (const [table, expected] of Object.entries(manifest.tables || {})) {
      if (!(table in actual)) {
        failures.push(`${table}: expected ${expected} rows, table missing`);
      } else if (actual[table] !== expected) {
        failures.push(`${table}: manifest ${expected} vs drill ${actual[table]}`);
      } else {
        console.log(`  OK ${table}: ${actual[table]} rows`);
      }
    }
    for (const t of CRITICAL_TABLES) {
      if (!(t in actual)) failures.push(`critical table missing after restore: ${t}`);
    }
    const { rows: u } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
    if (u[0].c < 1) failures.push('users table empty after restore');

    failures.push(...(await checkJsonColumns(pool)));

    if (failures.length > 0) throw new Error('Drill verification FAILED: ' + failures.join('; '));
    console.log('=== DRILL EXITOSO: backup restaurable, completo y semanticamente valido ===');
  } finally {
    rmSync(workdir, { recursive: true, force: true });
    await pool.end();
  }
}

main().catch((err) => {
  console.error('DRILL FALLO:', err.message);
  process.exit(1);
});
