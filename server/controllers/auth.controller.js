import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';
import { pool } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { paramsRepository } from '../repositories/params.repository.js';

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

  async register(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 100) {
        return res.status(400).json({ error: 'El usuario debe tener entre 3 y 100 caracteres.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
        return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres.' });
      }

      const sanitizedUser = username.trim();
      const sanitizedPass = password;

      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [sanitizedUser]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(sanitizedPass, salt);

      const { rows } = await pool.query(
        `INSERT INTO users (id, username, password_hash, role)
         VALUES (gen_random_uuid(), $1, $2, 'user') RETURNING id`,
        [sanitizedUser, passwordHash]
      );
      const userId = rows[0].id;

      await paramsRepository.createDefault(userId);

      const { JWT_SECRET } = getConfig();
      const token = jwt.sign({ id: userId, username: sanitizedUser, role: 'user' }, JWT_SECRET, { expiresIn: '12h' });

      logAudit({ action: 'REGISTER', entity: 'users', entityId: userId, changedBy: req.user?.username, userId });

      res.status(201).json({ token, userId });
    } catch (err) {
      next(err);
    }
  },
};
