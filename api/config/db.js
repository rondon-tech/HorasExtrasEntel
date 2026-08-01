/**
 * Shared database pool — proxy that delegates to PoolManager.
 *
 * All existing code that does `pool.query(sql, params)` continues to work
 * unchanged. PoolManager handles the dual-pool + failover logic transparently.
 */

import { poolManager } from './db-failover.js';
import { logger } from '../utils/logger.js';

/**
 * Proxy object that looks like a pg.Pool to all consumers.
 * - `.query()` → routes through PoolManager (with failover)
 * - `.on()`     → registers on the PRIMARY pool only (for error events)
 */
export const pool = {
  query(text, params) {
    return poolManager.query(text, params);
  },

  on(event, handler) {
    poolManager.primary?.on(event, handler);
  },
};

// Log idle-client errors on the primary pool (unchanged from original)
pool.on('error', (err) => {
  logger.error(`Unexpected error on idle client: ${err.message}`, err);
});
