/**
 * Migration: 004 — Add updated_at to params table for audit trail
 */

export async function up(pgm) {
  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE params DROP COLUMN IF EXISTS updated_at;`);
}
