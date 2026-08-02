/**
 * Migration: 007 — User profile fields
 *
 * Adds personal data columns to users: first_name, last_name, email, phone.
 * Existing users get default placeholders so the system doesn't break.
 */

export async function up(pgm) {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);

  pgm.sql(`UPDATE users SET first_name = 'Usuario' WHERE first_name IS NULL;`);
  pgm.sql(`UPDATE users SET last_name = 'Temporal' WHERE last_name IS NULL;`);
  pgm.sql(`UPDATE users SET email = 'pendiente@empresa.com' WHERE email IS NULL;`);
  pgm.sql(`UPDATE users SET phone = '000000000' WHERE phone IS NULL;`);

  pgm.sql(`ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN email SET NOT NULL;`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS first_name;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS last_name;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS email;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS phone;`);
}
