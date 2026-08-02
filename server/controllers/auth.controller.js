import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';
import { pool } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { paramsRepository } from '../repositories/params.repository.js';
import { emailService } from '../services/email.service.js';

const GLOBAL_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

function generateTempPassword() {
  return crypto.randomBytes(8).toString('hex');
}

export const authController = {
  async login(req, res) {
    const { username, password } = req.body;
    const { ADMIN_USER, ADMIN_PASSWORD, JWT_SECRET } = getConfig();

    // 1. Try database-authenticated user (bcrypt hashed)
    try {
      const { rows } = await pool.query(
        'SELECT id, password_hash, role, password_change_required FROM users WHERE username = $1',
        [username]
      );
      if (rows.length > 0) {
        const valid = await bcrypt.compare(password, rows[0].password_hash);
        if (valid) {
          const token = jwt.sign(
            { id: rows[0].id, username, role: rows[0].role, passwordChangeRequired: rows[0].password_change_required ?? false },
            JWT_SECRET,
            { expiresIn: '12h' }
          );
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
      const token = jwt.sign(
        { id: GLOBAL_ADMIN_ID, username, role: 'global_admin', passwordChangeRequired: false },
        JWT_SECRET,
        { expiresIn: '12h' }
      );
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

      const sanitizedUser = username.trim();
      const tempPassword = (password && typeof password === 'string' && password.length >= 6)
        ? password
        : generateTempPassword();

      if (!password || typeof password !== 'string' || tempPassword.length < 6 || tempPassword.length > 128) {
        return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres.' });
      }

      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [sanitizedUser]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);

      const { rows } = await pool.query(
        `INSERT INTO users (id, username, password_hash, role, password_change_required)
         VALUES (gen_random_uuid(), $1, $2, 'user', true) RETURNING id`,
        [sanitizedUser, passwordHash]
      );
      const userId = rows[0].id;

      await paramsRepository.createDefault(userId);

      emailService.sendWelcomeEmail(sanitizedUser, tempPassword).catch(() => {});

      const { JWT_SECRET } = getConfig();
      const token = jwt.sign(
        { id: userId, username: sanitizedUser, role: 'user', passwordChangeRequired: true },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      logAudit({ action: 'REGISTER', entity: 'users', entityId: userId, changedBy: req.user?.username, userId });

      res.status(201).json({ token, userId, tempPassword });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || typeof oldPassword !== 'string') {
        return res.status(400).json({ error: 'La contraseña actual es requerida.' });
      }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      }

      const { rows } = await pool.query(
        'SELECT password_hash, username, role FROM users WHERE id = $1',
        [userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await pool.query(
        'UPDATE users SET password_hash = $1, password_change_required = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHash, userId]
      );

      const { JWT_SECRET } = getConfig();
      const token = jwt.sign(
        { id: userId, username: rows[0].username, role: rows[0].role, passwordChangeRequired: false },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      logAudit({ action: 'PASSWORD_CHANGE', entity: 'users', entityId: userId, changedBy: rows[0].username, userId });

      res.json({ token });
    } catch (err) {
      next(err);
    }
  },
};
