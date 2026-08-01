/**
 * Database Backup Script
 *
 * Connects to Neon.tech (primary), dumps all user tables to SQL,
 * compresses with gzip, and uploads to Cloudflare R2.
 *
 * Triggered by GitHub Actions every 2 hours.
 * Also runnable manually:  node scripts/backup.mjs
 */

import { createGzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
const required = ['DATABASE_URL', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`ERROR: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL connection
// ---------------------------------------------------------------------------
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ---------------------------------------------------------------------------
// Cloudflare R2 client (S3-compatible)
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
// Dump all user tables to SQL
// ---------------------------------------------------------------------------
async function dumpDatabase() {
  const { rows: tables } = await pool.query(`
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
    ORDER BY tablename
  `);

  const lines = [];
  const now = new Date().toISOString();
  lines.push(`-- Backup generated: ${now}`);
  lines.push(`-- Tables: ${tables.map(t => t.tablename).join(', ')}`);
  lines.push('');

  for (const { tablename } of tables) {
    try {
      const { rows } = await pool.query(`SELECT * FROM "${tablename}" ORDER BY 1`);
      if (rows.length === 0) continue;

      // Get column names from the first row
      const cols = Object.keys(rows[0]);

      lines.push(`-- Table: ${tablename} (${rows.length} rows)`);

      for (const row of rows) {
        const values = cols.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return String(val);
          // Escape single quotes in strings
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        lines.push(`INSERT INTO "${tablename}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push('');
    } catch (err) {
      console.warn(`WARN: Could not dump table ${tablename}: ${err.message}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Compress and upload to R2
// ---------------------------------------------------------------------------
async function uploadToR2(sqlContent, key) {
  const gzip = createGzip();
  const chunks = [];

  const readable = Readable.from([sqlContent]);
  await new Promise((resolve, reject) => {
    readable
      .pipe(gzip)
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', resolve)
      .on('error', reject);
  });

  const body = Buffer.concat(chunks);

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/gzip',
  }));

  return body.length;
}

// ---------------------------------------------------------------------------
// Clean up old backups (> 30 days)
// ---------------------------------------------------------------------------
async function cleanupOldBackups() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let continuationToken = undefined;
  let deleted = 0;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'backups/',
      ContinuationToken: continuationToken,
    });
    const result = await r2.send(cmd);

    for (const obj of result.Contents || []) {
      if (obj.LastModified && obj.LastModified < thirtyDaysAgo) {
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
        deleted++;
        console.log(`  Deleted old backup: ${obj.Key}`);
      }
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  if (deleted > 0) console.log(`Cleaned up ${deleted} old backup(s).`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Starting database backup...');

  console.log('Dumping database...');
  const sql = await dumpDatabase();
  console.log(`  Dump size: ${(sql.length / 1024).toFixed(1)} KB`);

  const key = `backups/backup-${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')}.sql.gz`;
  console.log(`Compressing and uploading to R2: ${key}`);
  const size = await uploadToR2(sql, key);
  console.log(`  Uploaded ${(size / 1024).toFixed(1)} KB`);

  console.log('Cleaning up old backups (>30 days)...');
  await cleanupOldBackups();

  console.log('Backup complete.');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
