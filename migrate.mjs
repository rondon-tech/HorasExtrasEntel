/**
 * Migration runner.
 *
 * Usage:  node migrate.mjs up
 *         node migrate.mjs down
 *
 * Uses the same DATABASE_URL from .env, validated by api/config/env.js.
 */

import { getConfig } from './server/config/env.js';
import dotenv from 'dotenv';

dotenv.config();

// Validate env vars before connecting to the database
getConfig();

const command = process.argv[2] || 'up';
const migDir = 'server/migrations';

try {
  execSync(
    `npx node-pg-migrate ${command} --migrations-dir ${migDir} --migration-filename-format utc --migration-table-name pgmigrations`,
    { stdio: 'inherit', env: { ...process.env } }
  );
  console.log(`\nMigration "${command}" completed successfully.`);
} catch (err) {
  console.error(`\nMigration "${command}" failed:`, err.message);
  process.exit(1);
}
