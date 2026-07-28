/**
 * Migration runner.
 *
 * Usage:  node migrate.mjs up
 *         node migrate.mjs down
 *
 * Uses the same DATABASE_URL from .env, validated by api/config/env.js.
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { getConfig } from './api/config/env.js';

dotenv.config();

// Validate env vars before connecting to the database
getConfig();

const command = process.argv[2] || 'up';

try {
  execSync(
    `npx node-pg-migrate ${command} --migrations-dir api/migrations --migration-filename-format utc --migration-table-name pgmigrations`,
    { stdio: 'inherit', env: { ...process.env } }
  );
  console.log(`\nMigration "${command}" completed successfully.`);
} catch (err) {
  console.error(`\nMigration "${command}" failed:`, err.message);
  process.exit(1);
}
