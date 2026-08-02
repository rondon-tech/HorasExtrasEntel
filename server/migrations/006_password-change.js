/**
 * Migration: 006 — Password change required flag
 *
 * Adds password_change_required boolean to users table.
 * New users are forced to change their password on first login.
 */

export async function up(pgm) {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false;`);
  pgm.sql(`UPDATE users SET password_change_required = true WHERE password_change_required IS NULL;`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS password_change_required;`);
}
