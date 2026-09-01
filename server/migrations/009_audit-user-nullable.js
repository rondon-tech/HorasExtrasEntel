/**
 * Migration: 009 — audit_log.user_id nullable
 *
 * Login audit entries (LOGIN_OK/LOGIN_FAIL and env-admin logins) have no
 * user row to reference. entity_id already stores the username.
 */

export async function up(pgm) {
  pgm.sql(`ALTER TABLE audit_log ALTER COLUMN user_id DROP NOT NULL;`);
}

export async function down(pgm) {
  pgm.sql(`UPDATE audit_log SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users);`);
  pgm.sql(`DELETE FROM audit_log WHERE user_id IS NULL;`);
  pgm.sql(`ALTER TABLE audit_log ALTER COLUMN user_id SET NOT NULL;`);
}
