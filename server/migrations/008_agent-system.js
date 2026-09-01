/**
 * Migration: 008 — Agent system tables + audit_log fix
 *
 * 1. Widen audit_log.action (VARCHAR(10) truncated 'PASSWORD_RESET'/'PASSWORD_CHANGE')
 * 2. Create agent tables: sessions, messages, proposals, anomalies
 */

export async function up(pgm) {
  pgm.sql(`ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(30);`);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS agent_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent VARCHAR(30) NOT NULL DEFAULT 'assistant',
      title VARCHAR(200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS agent_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS agent_proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'rejected', 'executed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS agent_anomalies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      score NUMERIC(5,2) NOT NULL DEFAULT 0,
      reasons JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewed', 'dismissed')),
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON agent_messages (session_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions (user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_anomalies_user ON agent_anomalies (user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_anomalies_status ON agent_anomalies (status);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS agent_anomalies;`);
  pgm.sql(`DROP TABLE IF EXISTS agent_proposals;`);
  pgm.sql(`DROP TABLE IF EXISTS agent_messages;`);
  pgm.sql(`DROP TABLE IF EXISTS agent_sessions;`);
  pgm.sql(`ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(10);`);
}
