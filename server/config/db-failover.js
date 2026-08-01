/**
 * PoolManager — Dual-pool database with automatic failover.
 *
 * Maintains two PostgreSQL pools:
 *   - PRIMARY:  DATABASE_URL (Neon.tech #1 — production)
 *   - FALLBACK: DATABASE_URL_FALLBACK (Neon.tech #2 — standby)
 *
 * Behavior:
 *   - All queries go to PRIMARY by default.
 *   - If PRIMARY fails 3 consecutive queries with a connection-level error,
 *     the manager switches all new queries to FALLBACK.
 *   - While on FALLBACK, a health-check timer probes PRIMARY every 60 seconds.
 *     After 3 consecutive successes, it switches back.
 *   - Application-level errors (unique violations, FK errors, etc.) do NOT
 *     trigger failover — only connection/timeout/host-unreachable errors.
 */

import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/** PostgreSQL error codes that indicate the database host is unreachable. */
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  '57P01',   // admin_shutdown
  '57P02',   // crash_shutdown
  '57P03',   // cannot_connect_now
  '08000',   // connection_exception
  '08003',   // connection_does_not_exist
  '08006',   // connection_failure
  '08001',   // sqlclient_unable_to_establish_sqlconnection
  '53300',   // too_many_connections
]);

const FAILURE_THRESHOLD = 3;
const SUCCESS_THRESHOLD = 3;
const HEALTH_CHECK_INTERVAL_MS = 60_000;

class PoolManager {
  /**
   * @param {string} primaryUrl
   * @param {string|undefined} fallbackUrl — if not set, failover is disabled
   */
  constructor(primaryUrl, fallbackUrl) {
    this._primaryUrl = primaryUrl;
    this._fallbackUrl = fallbackUrl;
    this._primary = null;
    this._fallback = null;
    this._active = null;
    this._failures = 0;
    this._successes = 0;
    this._healthTimer = null;
    this._initialized = false;
  }

  // -----------------------------------------------------------------------
  // Public helpers (accessed by db.js for pool.on registration)
  // -----------------------------------------------------------------------

  get primary() {
    return this._primary;
  }

  get fallback() {
    return this._fallback;
  }

  get isOnFallback() {
    return this._active === this._fallback;
  }

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._primary = new Pool({
      connectionString: this._primaryUrl,
      ssl: { rejectUnauthorized: false },
    });

    if (this._fallbackUrl) {
      this._fallback = new Pool({
        connectionString: this._fallbackUrl,
        ssl: { rejectUnauthorized: false },
      });
    }

    this._active = this._primary;

    if (this._fallback) {
      this._startHealthCheck();
      logger.info('PoolManager: PRIMARY + FALLBACK pools initialized');
    } else {
      logger.info('PoolManager: PRIMARY pool initialized (no fallback configured)');
    }
  }

  // -----------------------------------------------------------------------
  // Query routing
  // -----------------------------------------------------------------------

  /**
   * Execute a query on the currently active pool.
   * If a connection-level error occurs on the primary and a fallback is
   * configured, the manager may switch pools automatically.
   */
  async query(text, params) {
    this.init();

    try {
      const result = await this._active.query(text, params);
      return result;
    } catch (err) {
      if (this._active === this._primary && this._fallback && this._isConnectionError(err)) {
        this._failures++;
        logger.warn(
          `PoolManager: PRIMARY failure ${this._failures}/${FAILURE_THRESHOLD} — ${err.code || err.message?.slice(0, 60)}`
        );
        if (this._failures >= FAILURE_THRESHOLD) {
          this._switchToFallback();
        }
      }
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Pool switching
  // -----------------------------------------------------------------------

  _switchToFallback() {
    if (this._active === this._fallback) return;
    this._active = this._fallback;
    this._failures = 0;
    this._successes = 0;
    logger.error('PoolManager: SWITCHED TO FALLBACK DATABASE');
  }

  _switchToPrimary() {
    if (this._active === this._primary) return;
    this._active = this._primary;
    this._successes = 0;
    logger.info('PoolManager: SWITCHED BACK TO PRIMARY DATABASE');
  }

  // -----------------------------------------------------------------------
  // Health check (probes primary while on fallback)
  // -----------------------------------------------------------------------

  _startHealthCheck() {
    this._healthTimer = setInterval(async () => {
      if (this._active !== this._fallback) return;

      try {
        await this._primary.query('SELECT 1');
        this._successes++;
        if (this._successes >= SUCCESS_THRESHOLD) {
          this._switchToPrimary();
        }
      } catch {
        this._successes = 0;
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    // Allow the Node process to exit even if the timer is running
    if (this._healthTimer?.unref) this._healthTimer.unref();
  }

  // -----------------------------------------------------------------------
  // Error classification
  // -----------------------------------------------------------------------

  _isConnectionError(err) {
    if (!err) return false;
    // Node.js system errors (DNS, TCP)
    if (err.code && CONNECTION_ERROR_CODES.has(err.code)) return true;
    // pg-specific errors carry a .code property
    if (err.code && CONNECTION_ERROR_CODES.has(err.code)) return true;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------
import { getConfig } from './env.js';

const env = getConfig();
const fallbackUrl = process.env.DATABASE_URL_FALLBACK || '';

export const poolManager = new PoolManager(env.DATABASE_URL, fallbackUrl);
