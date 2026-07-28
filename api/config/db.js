import pg from 'pg';
import { getConfig } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const env = getConfig();

const sslConfig = env.isProduction
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig,
});

pool.on('error', (err) => {
  logger.error(`Unexpected error on idle client: ${err.message}`, err);
});
