/**
 * Shared helpers for backup / restore / restore-drill scripts.
 *
 * - Paginated R2 listing (ListObjectsV2 maxes at 1000 keys per call)
 * - AES-256-GCM encryption of backup blobs (key from BACKUP_ENCRYPTION_KEY)
 * - SHA-256 integrity digests
 * - pg_dump / pg_restore execution via execFile (no shell → no injection)
 * - SSL-enforced Postgres connection strings
 */

import { execFile } from 'node:child_process';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

export const BACKUP_PREFIX = 'backups/';
export const MONTHLY_PREFIX = 'monthly/';
export const DUMP_SUFFIX = '.dump.enc';
export const MANIFEST_SUFFIX = '.manifest.json';
export const CMD_TIMEOUT_MS = 10 * 60 * 1000;

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export function r2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: requireEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  });
}

/** Enforce TLS toward Postgres unless explicitly disabled for local dev. */
export function withSsl(connectionString) {
  if (process.env.PGSSLMODE === 'disable') return connectionString;
  if (/[?&]sslmode=/i.test(connectionString)) return connectionString;
  return connectionString + (connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require');
}

/** SSL options for node-pg pools (fail closed; opt-out only via PGSSLMODE=disable). */
export function pgSsl() {
  if (process.env.PGSSLMODE === 'disable') return false;
  return { rejectUnauthorized: true };
}

/** Run a binary with argv (no shell). Rejects with the tail of stderr on failure. */
export function runCmd(file, args, timeoutMs = CMD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const tail = String(stderr || err.message).slice(-2000);
        reject(new Error(`${file} failed: ${tail}`));
      } else {
        resolve({ stdout, stderr: String(stderr || '') });
      }
    });
  });
}

export function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function getEncryptionKey() {
  const key = requireEnv('BACKUP_ENCRYPTION_KEY');
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    console.error('ERROR: BACKUP_ENCRYPTION_KEY must be 64 hex chars (32 bytes).');
    console.error("Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    process.exit(1);
  }
  return Buffer.from(key, 'hex');
}

/** Layout: IV(12) | authTag(16) | ciphertext. */
export function encryptBuffer(plain, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(blob, key) {
  if (blob.length < 28) throw new Error('Encrypted blob too short — not a valid backup file.');
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** List ALL objects under a prefix (handles pagination). */
export async function listAllObjects(r2, bucket, prefix) {
  const objects = [];
  let token;
  do {
    const result = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
    }));
    for (const o of result.Contents || []) objects.push(o);
    token = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

/**
 * Find the newest backup pair (.dump.enc + .manifest.json sharing a basename).
 * Returns { key, manifestKey, lastModified }.
 */
export async function findLatestBackup(r2, bucket, prefix = BACKUP_PREFIX) {
  const objects = await listAllObjects(r2, bucket, prefix);
  const dumps = objects
    .filter((o) => o.Key && o.Key.endsWith(DUMP_SUFFIX))
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
  if (dumps.length === 0) throw new Error(`No backups found under ${prefix}`);
  const latest = dumps[0];
  const manifestKey = latest.Key.slice(0, -DUMP_SUFFIX.length) + MANIFEST_SUFFIX;
  return { key: latest.Key, manifestKey, lastModified: latest.LastModified };
}

export async function downloadObject(r2, bucket, key) {
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  await new Promise((resolve, reject) => {
    response.Body.on('data', (c) => chunks.push(c)).on('end', resolve).on('error', reject);
  });
  return Buffer.concat(chunks);
}

export async function uploadObject(r2, bucket, key, body, contentType) {
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

/** Row counts for every table in the public schema. */
export async function getRowCounts(pool) {
  const { rows: tables } = await pool.query(`
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
    ORDER BY tablename
  `);
  const counts = {};
  for (const { tablename } of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM "${tablename}"`);
    counts[tablename] = rows[0].c;
  }
  return counts;
}

/** Mask a DATABASE_URL for logging (hide user, password, query). */
export function maskDbUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '[unparseable-url]';
  }
}
