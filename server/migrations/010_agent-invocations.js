/**
 * Migration: 010 — agent_invocations telemetry
 *
 * One row per model attempt (gateway, model, latency, tokens, finish reason).
 * Powers the chain reordering evidence and the admin usage panel.
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS agent_invocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
      agent VARCHAR(30) NOT NULL DEFAULT 'assistant',
      gateway VARCHAR(20) NOT NULL,
      model VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL
        CHECK (status IN ('ok', 'empty', 'error', 'aborted')),
      latency_ms INTEGER,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      finish_reason VARCHAR(40),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_invocations_user ON agent_invocations (user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_invocations_created ON agent_invocations (created_at DESC);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_agent_invocations_model ON agent_invocations (gateway, model);`);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS agent_invocations;`);
}
