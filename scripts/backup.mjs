/**
 * Database Backup Script (v2 — pg_dump custom format + encryption + manifest)
 *
 * 1. pg_dump (custom format, --no-owner --no-acl) → exact snapshot, schema included.
 * 2. Row-count manifest with SHA-256 of the stored blob.
 * 3. AES-256-GCM encryption (BACKUP_ENCRYPTION_KEY) before upload to R2.
 * 4. Monthly copy (day 1) to monthly/ with 7-year retention.
 * 5. Any failure aborts with exit code 1 — never reports partial success.
 *
 * Triggered by GitHub Actions every 2 hours.
 * Usage: node scripts/backup.mjs
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import dotenv from 'dotenv';

import {
  BACKUP_PREFIX,
  MONTHLY_PREFIX,
  findLatestBackup,
  downloadObject,
  encryptBuffer,
  getEncryptionKey,
  getRowCounts,
  listAllObjects,
  maskDbUrl,
  pgSsl,
  r2Client,
  requireEnv,
  runCmd,
  sha256Hex,
  uploadObject,
  withSsl,
} from './lib/backup-common.mjs';

dotenv.config();

const RETENTION_DAYS = 30;
const MONTHLY_RETENTION_YEARS = 7;

function stamp() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

/** pg_dump must exist (installed on GH runners; apt fallback in workflow). */
async function assertPgDump() {
  try {
    const { stdout } = await runCmd('pg_dump', ['--version'], 15000);
    console.log(`  Using ${stdout.trim()}`);
  } catch {
    throw new Error('pg_dump not found. Install postgresql-client (see backup.yml).');
  }
}

async function cleanupPrefix(r2, bucket, prefix, olderThanMs, label) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const objects = await listAllObjects(r2, bucket, prefix);
  let deleted = 0;
  for (const obj of objects) {
    if (obj.LastModified && obj.LastModified < cutoff) {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      deleted++;
      console.log(`  Deleted old ${label}: ${obj.Key}`);
    }
  }
  if (deleted > 0) console.log(`  Cleaned up ${deleted} old ${label}(s).`);
}

async function main() {
  console.log('Starting database backup (pg_dump)...');

  const databaseUrl = withSsl(requireEnv('DATABASE_URL'));
  const bucket = requireEnv('R2_BUCKET');
  const key = getEncryptionKey();
  const r2 = r2Client();

  console.log(`  Target: ${maskDbUrl(databaseUrl)}`);
  await assertPgDump();

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl, ssl: pgSsl() });
  const workdir = mkdtempSync(join(tmpdir(), 'hhee-backup-'));

  try {
    console.log('Counting rows for manifest...');
    const counts = await getRowCounts(pool);
    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`  ${Object.keys(counts).length} tables, ${totalRows} rows`);

    const dumpFile = join(workdir, 'backup.dump');
    console.log('Running pg_dump (custom format)...');
    await runCmd('pg_dump', [
      databaseUrl,
      '--format=custom',
      '--no-owner',
      '--no-acl',
      `--file=${dumpFile}`,
    ]);
    const dump = readFileSync(dumpFile);
    if (dump.length === 0) throw new Error('pg_dump produced an empty file — aborting.');
    console.log(`  Dump size: ${(dump.length / 1024).toFixed(1)} KB`);

    console.log('Encrypting (AES-256-GCM)...');
    const encrypted = encryptBuffer(dump, key);

    const name = `backup-${stamp()}`;
    const dumpKey = `${BACKUP_PREFIX}${name}.dump.enc`;
    const manifestKey = `${BACKUP_PREFIX}${name}.manifest.json`;
    const manifest = {
      format: 'pg_dump-custom+aes256gcm-v1',
      createdAt: new Date().toISOString(),
      sha256: sha256Hex(encrypted),
      sizeBytes: encrypted.length,
      plainSizeBytes: dump.length,
      tables: counts,
      totalRows,
    };

    console.log(`Uploading ${dumpKey} (${(encrypted.length / 1024).toFixed(1)} KB)...`);
    await uploadObject(r2, bucket, dumpKey, encrypted, 'application/octet-stream');
    await uploadObject(r2, bucket, manifestKey, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');
    console.log('  Upload complete (dump + manifest).');

    // Monthly long-retention copy (accounting / labor retention).
    if (new Date().getUTCDate() === 1) {
      const monthlyDump = `${MONTHLY_PREFIX}${name}.dump.enc`;
      const monthlyManifest = `${MONTHLY_PREFIX}${name}.manifest.json`;
      console.log(`Monthly copy → ${monthlyDump}`);
      await r2.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${dumpKey}`, Key: monthlyDump }));
      await r2.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${manifestKey}`, Key: monthlyManifest }));
    }

    console.log('Cleaning up expired backups...');
    await cleanupPrefix(r2, bucket, BACKUP_PREFIX, RETENTION_DAYS * 24 * 3600 * 1000, 'backup');
    await cleanupPrefix(
      r2, bucket, MONTHLY_PREFIX,
      MONTHLY_RETENTION_YEARS * 365 * 24 * 3600 * 1000, 'monthly backup',
    );

    // Self-check: the backup we just wrote must be listable with its manifest.
    const latest = await findLatestBackup(r2, bucket);
    if (latest.key !== dumpKey) throw new Error(`Self-check failed: latest is ${latest.key}, expected ${dumpKey}`);
    const storedManifest = JSON.parse((await downloadObject(r2, bucket, latest.manifestKey)).toString('utf-8'));
    if (storedManifest.sha256 !== manifest.sha256) throw new Error('Self-check failed: manifest digest mismatch.');
    console.log('Self-check OK: backup listed with matching manifest.');

    console.log('Backup complete.');
  } finally {
    rmSync(workdir, { recursive: true, force: true });
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Backup FAILED:', err.message);
  process.exit(1);
});
