/**
 * Migration: 005 — Multi-tenant architecture
 *
 * Adds user_id foreign key to all core tables (records, expenses, audit_log)
 * and transforms params from single-row to per-user configuration.
 *
 * Roles: 'user' (tenant owner) and 'global_admin' (platform admin).
 *
 * Uses a well-known UUID for the global admin so the env-variable
 * login fallback can reference it without a DB lookup.
 */

const GLOBAL_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

export async function up(pgm) {
  // ── 1. Enforce role values on users table ──────────────────────────
  pgm.sql(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_role,
    ADD CONSTRAINT chk_users_role CHECK (role IN ('user', 'global_admin'));
  `);

  // ── 2. Ensure global_admin user exists ────────────────────────────
  pgm.sql(`
    INSERT INTO users (id, username, password_hash, role)
    VALUES ('${GLOBAL_ADMIN_ID}', 'admin', '', 'global_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'global_admin';
  `);

  // ── 3. Add user_id to records ─────────────────────────────────────
  pgm.sql(`ALTER TABLE records ADD COLUMN IF NOT EXISTS user_id UUID;`);
  pgm.sql(`
    UPDATE records
    SET user_id = '${GLOBAL_ADMIN_ID}'
    WHERE user_id IS NULL;
  `);
  pgm.sql(`ALTER TABLE records ALTER COLUMN user_id SET NOT NULL;`);
  pgm.sql(`
    ALTER TABLE records
    ADD CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_records_user_id ON records (user_id);`);

  // ── 4. Add user_id to expenses ────────────────────────────────────
  pgm.sql(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID;`);
  pgm.sql(`
    UPDATE expenses
    SET user_id = '${GLOBAL_ADMIN_ID}'
    WHERE user_id IS NULL;
  `);
  pgm.sql(`ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;`);
  pgm.sql(`
    ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);`);

  // ── 5. Add user_id to audit_log ───────────────────────────────────
  pgm.sql(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id UUID;`);
  pgm.sql(`
    UPDATE audit_log
    SET user_id = '${GLOBAL_ADMIN_ID}'
    WHERE user_id IS NULL;
  `);
  pgm.sql(`ALTER TABLE audit_log ALTER COLUMN user_id SET NOT NULL;`);
  pgm.sql(`
    ALTER TABLE audit_log
    ADD CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);`);

  // ── 6. Transform params from single-row to per-user ───────────────
  // 6a. Add user_id column
  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS user_id UUID;`);
  pgm.sql(`
    UPDATE params
    SET user_id = '${GLOBAL_ADMIN_ID}'
    WHERE user_id IS NULL;
  `);
  pgm.sql(`ALTER TABLE params ALTER COLUMN user_id SET NOT NULL;`);
  pgm.sql(`
    ALTER TABLE params
    ADD CONSTRAINT fk_params_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT uq_params_user_id UNIQUE (user_id);
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_params_user_id ON params (user_id);`);

  // 6b. Convert id from INTEGER to UUID so future users get gen_random_uuid()
  pgm.sql(`ALTER TABLE params ALTER COLUMN id DROP DEFAULT;`);
  pgm.sql(`ALTER TABLE params ALTER COLUMN id SET DATA TYPE UUID USING gen_random_uuid();`);
  pgm.sql(`ALTER TABLE params ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
}

export async function down(pgm) {
  // params — revert id back to INTEGER
  pgm.sql(`ALTER TABLE params ALTER COLUMN id DROP DEFAULT;`);
  pgm.sql(`ALTER TABLE params ALTER COLUMN id SET DATA TYPE INTEGER USING 1;`);
  pgm.sql(`ALTER TABLE params ALTER COLUMN id SET DEFAULT 1;`);

  pgm.sql(`ALTER TABLE params DROP CONSTRAINT IF EXISTS uq_params_user_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_params_user_id;`);
  pgm.sql(`ALTER TABLE params DROP CONSTRAINT IF EXISTS fk_params_user;`);
  pgm.sql(`ALTER TABLE params DROP COLUMN IF EXISTS user_id;`);

  // audit_log
  pgm.sql(`DROP INDEX IF EXISTS idx_audit_log_user_id;`);
  pgm.sql(`ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS fk_audit_log_user;`);
  pgm.sql(`ALTER TABLE audit_log DROP COLUMN IF EXISTS user_id;`);

  // expenses
  pgm.sql(`DROP INDEX IF EXISTS idx_expenses_user_id;`);
  pgm.sql(`ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_user;`);
  pgm.sql(`ALTER TABLE expenses DROP COLUMN IF EXISTS user_id;`);

  // records
  pgm.sql(`DROP INDEX IF EXISTS idx_records_user_id;`);
  pgm.sql(`ALTER TABLE records DROP CONSTRAINT IF EXISTS fk_records_user;`);
  pgm.sql(`ALTER TABLE records DROP COLUMN IF EXISTS user_id;`);

  // users role constraint
  pgm.sql(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;`);

  // Delete the global_admin user created by the up migration
  pgm.sql(`DELETE FROM users WHERE id = '${GLOBAL_ADMIN_ID}';`);
}
