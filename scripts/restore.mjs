/**
 * Database Restore Script (v2 — pg_restore from encrypted pg_dump snapshot)
 *
 * 1. Downloads the latest backup pair (.dump.enc + .manifest.json) from R2.
 * 2. Verifies SHA-256 against the manifest (detects corruption / truncation).
 * 3. Decrypts (AES-256-GCM — authentication fails loudly on tampering).
 * 4. pg_restore --clean --if-exists --no-owner --no-acl --single-transaction
 *    (atomic: any error rolls everything back; true restore, not a merge).
 * 5. Post-restore verification: row counts must match the manifest.
 *
 * Safety gates:
 * - RESTORE_TARGET=fallback → restores DATABASE_URL_FALLBACK.
 * - RESTORE_TARGET=primary  → restores DATABASE_URL and ALSO requires
 *   CONFIRM_RESTORE_PRIMARY=RESTORE-PRIMARY (typed confirmation).
 *
 * Usage: RESTORE_TARGET=fallback node scripts/restore.mjs
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
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

dotenv.config();

function resolveTarget() {
  const target = requireEnv('RESTORE_TARGET');
  if (target !== 'fallback' && target !== 'primary') {
    console.error('ERROR: RESTORE_TARGET must be "fallback" or "primary". Refusing to guess.');
    process.exit(1);
  }
  if (target === 'primary') {
    if (process.env.CONFIRM_RESTORE_PRIMARY !== 'RESTORE-PRIMARY') {
      console.error('ERROR: Refusing to restore PRIMARY without CONFIRM_RESTORE_PRIMARY=RESTORE-PRIMARY.');
      process.exit(1);
    }
    console.error('!!! RESTORING PRIMARY DATABASE — DESTRUCTIVE !!!');
    return withSsl(requireEnv('DATABASE_URL'));
  }
  return withSsl(requireEnv('DATABASE_URL_FALLBACK'));
}

async function main() {
  console.log('Starting database restore from R2...');

  const targetUrl = resolveTarget();
  const bucket = requireEnv('R2_BUCKET');
  const key = getEncryptionKey();
  const r2 = r2Client();

  console.log(`  Target: ${maskDbUrl(targetUrl)}`);

  const backup = await findLatestBackup(r2, bucket);
  console.log(`  Backup: ${backup.key} (${backup.lastModified?.toISOString()})`);

  console.log('Downloading backup + manifest...');
  const [blob, manifestRaw] = await Promise.all([
    downloadObject(r2, bucket, backup.key),
    downloadObject(r2, bucket, backup.manifestKey),
  ]);
  const manifest = JSON.parse(manifestRaw.toString('utf-8'));

  console.log('Verifying SHA-256...');
  const digest = sha256Hex(blob);
  if (digest !== manifest.sha256) {
    throw new Error(`Digest mismatch: manifest ${manifest.sha256}, actual ${digest}. Backup corrupt — aborting.`);
  }
  console.log('  Digest OK.');

  console.log('Decrypting...');
  let dump;
  try {
    dump = decryptBuffer(blob, key);
  } catch {
    throw new Error('Decryption failed (wrong BACKUP_ENCRYPTION_KEY or tampered file). Aborting.');
  }

  const workdir = mkdtempSync(join(tmpdir(), 'hhee-restore-'));
  const { Pool } = pg;
  const pool = new Pool({ connectionString: targetUrl, ssl: pgSsl() });

  try {
    const dumpFile = join(workdir, 'backup.dump');
    writeFileSync(dumpFile, dump);

    console.log('Running pg_restore (single transaction, atomic)...');
    await runCmd('pg_restore', [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      '--single-transaction',
      `--dbname=${targetUrl}`,
      dumpFile,
    ]);
    console.log('  pg_restore finished.');

    console.log('Verifying row counts against manifest...');
    const actual = await getRowCounts(pool);
    const failures = [];
    for (const [table, expected] of Object.entries(manifest.tables || {})) {
      if (!(table in actual)) {
        failures.push(`${table}: expected ${expected} rows, table missing after restore`);
      } else if (actual[table] !== expected) {
        failures.push(`${table}: manifest ${expected} vs restored ${actual[table]}`);
      } else {
        console.log(`  OK ${table}: ${actual[table]} rows`);
      }
    }
    if (failures.length > 0) {
      throw new Error('Post-restore verification FAILED: ' + failures.join('; '));
    }
    console.log('Restore complete and verified.');
  } finally {
    rmSync(workdir, { recursive: true, force: true });
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Restore FAILED:', err.message);
  process.exit(1);
});
