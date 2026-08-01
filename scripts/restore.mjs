/**
 * Database Restore Script
 *
 * Downloads the latest backup from Cloudflare R2, decompresses it,
 * and restores it into the target database (DATABASE_URL_FALLBACK).
 *
 * Usage:  node scripts/restore.mjs
 *         DATABASE_URL_FALLBACK must be set in .env
 */

import { createGunzip } from 'node:zlib';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
const required = ['DATABASE_URL_FALLBACK', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`ERROR: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Cloudflare R2 client
// ---------------------------------------------------------------------------
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET;

// ---------------------------------------------------------------------------
// Find the most recent backup in R2
// ---------------------------------------------------------------------------
async function findLatestBackup() {
  const result = await r2.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: 'backups/backup-',
  }));

  const backups = (result.Contents || [])
    .filter(obj => obj.Key && obj.Key.endsWith('.sql.gz'))
    .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

  if (backups.length === 0) {
    throw new Error('No backups found in R2');
  }

  console.log(`Found ${backups.length} backup(s). Latest: ${backups[0].Key} (${backups[0].LastModified?.toISOString()})`);
  return backups[0];
}

// ---------------------------------------------------------------------------
// Download and decompress backup
// ---------------------------------------------------------------------------
async function downloadBackup(key) {
  const response = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];

  const gunzip = createGunzip();
  await new Promise((resolve, reject) => {
    response.Body
      .pipe(gunzip)
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', resolve)
      .on('error', reject);
  });

  return Buffer.concat(chunks).toString('utf-8');
}

// ---------------------------------------------------------------------------
// Execute SQL against target database
// ---------------------------------------------------------------------------
async function executeSQL(sql) {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_FALLBACK,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to target database. Executing SQL...');

  // Split by INSERT statements (skip comments)
  const statements = sql
    .split('\n')
    .filter(line => !line.startsWith('--') && line.trim().length > 0);

  let executed = 0;
  for (const statement of statements) {
    try {
      await pool.query(statement);
      executed++;
    } catch (err) {
      // Skip duplicate key errors (data already exists)
      if (err.code === '23505') continue;
      console.warn(`WARN: ${err.message.slice(0, 80)}`);
    }
  }

  console.log(`Executed ${executed} INSERT statements.`);
  await pool.end();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Starting database restore from R2...');

  const backup = await findLatestBackup();
  console.log(`Downloading ${backup.Key}...`);
  const sql = await downloadBackup(backup.Key);
  console.log(`Downloaded ${(sql.length / 1024).toFixed(1)} KB`);

  await executeSQL(sql);

  console.log('Restore complete.');
  console.log('Run `npm run migrate` on the fallback DB if schema updates are needed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Restore failed:', err.message);
  process.exit(1);
});
