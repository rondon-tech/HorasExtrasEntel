import { pool } from '../config/db.js';

const HISTORY_LIMIT = 20;

export const agentMemory = {
  async createSession(userId, agent = 'assistant', title = null) {
    const { rows } = await pool.query(
      `INSERT INTO agent_sessions (user_id, agent, title)
       VALUES ($1, $2, $3) RETURNING id, user_id, agent, title, created_at`,
      [userId, agent, title]
    );
    return rows[0];
  },

  async getSession(sessionId, userId) {
    const { rows } = await pool.query(
      'SELECT id, user_id, agent, title, created_at FROM agent_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    return rows[0] || null;
  },

  async listSessions(userId) {
    const { rows } = await pool.query(
      `SELECT id, agent, title, created_at FROM agent_sessions
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    return rows;
  },

  async getHistory(sessionId, limit = HISTORY_LIMIT) {
    const { rows } = await pool.query(
      `SELECT role, content, created_at FROM (
         SELECT role, content, created_at FROM agent_messages
         WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2
       ) recent ORDER BY created_at ASC`,
      [sessionId, limit]
    );
    return rows.map((r) => ({ role: r.role, content: r.content }));
  },

  async getHistoryByBudget(sessionId, charBudget = 12000, maxMessages = 20) {
    const { rows } = await pool.query(
      `SELECT role, content, created_at FROM (
         SELECT role, content, created_at FROM agent_messages
         WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2
       ) recent ORDER BY created_at ASC`,
      [sessionId, maxMessages * 2]
    );
    const selected = [];
    let used = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const cost = rows[i].content.length + 20;
      if (used + cost > charBudget && selected.length > 0) break;
      selected.unshift(rows[i]);
      used += cost;
      if (selected.length >= maxMessages) break;
    }
    return selected.map((r) => ({ role: r.role, content: r.content }));
  },
  async saveMessage({ sessionId, role, content, tokensIn = 0, tokensOut = 0 }) {
    await pool.query(
      `INSERT INTO agent_messages (session_id, role, content, tokens_in, tokens_out)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, role, content, tokensIn, tokensOut]
    );
  },
};
