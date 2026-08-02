import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';
import { pool } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

const GLOBAL_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

export const authController = {
  async login(req, res) {
    const { username, password } = req.body;
    const { ADMIN_USER, ADMIN_PASSWORD, JWT_SECRET } = getConfig();

    // 1. Try database-authenticated user (bcrypt hashed)
    try {
      const { rows } = await pool.query(
        'SELECT id, password_hash, role FROM users WHERE username = $1',
        [username]
      );
      if (rows.length > 0) {
        const valid = await bcrypt.compare(password, rows[0].password_hash);
        if (valid) {
          const token = jwt.sign({ id: rows[0].id, username, role: rows[0].role }, JWT_SECRET, { expiresIn: '12h' });
          logAudit({ action: 'LOGIN_OK', entity: 'users', entityId: username, changedBy: username });
          return res.json({ token });
        }
        logAudit({ action: 'LOGIN_FAIL', entity: 'users', entityId: username, changedBy: username });
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    } catch (_err) {
      // If users table doesn't exist yet (migration not run), fall through to env fallback
    }

    // 2. Fallback: environment variable credentials (backward compat for MVP)
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ id: GLOBAL_ADMIN_ID, username, role: 'global_admin' }, JWT_SECRET, { expiresIn: '12h' });
      logAudit({ action: 'LOGIN_OK', entity: 'users', entityId: username, changedBy: username });
      return res.json({ token });
    }

    logAudit({ action: 'LOGIN_FAIL', entity: 'users', entityId: username, changedBy: username });
    return res.status(401).json({ error: 'Credenciales inválidas' });
  },
};
