import { pool } from '../config/db.js';

/**
 * Lightweight audit logger.
 * Called by repositories after every mutation (create/update/delete).
 */
export async function logAudit({ action, entity, entityId, changedBy, details = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, entity, entity_id, changed_by, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [action, entity, entityId, changedBy, details ? JSON.stringify(details) : null]
    );
  } catch {
    // Audit failure should NEVER break the main flow.
  }
}
