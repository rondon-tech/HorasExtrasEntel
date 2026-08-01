/**
 * Migration: 003 — Audit log table
 *
 * Records every mutation (INSERT, UPDATE, DELETE) on core tables
 * so administrators can trace who changed what and when.
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR(10) NOT NULL,       -- INSERT | UPDATE | DELETE
      entity VARCHAR(50) NOT NULL,       -- records | expenses | params
      entity_id VARCHAR(100),            -- affected row UUID
      changed_by VARCHAR(100),           -- username from JWT
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      details JSONB                      -- snapshot or diff (nullable)
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity, entity_id);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS audit_log;`);
}
