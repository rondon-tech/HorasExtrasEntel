import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const GLOBAL_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

export const userRepository = {
  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [[usersResult], [countResult]] = await Promise.all([
      pool.query(
        `SELECT id, username, role, password_change_required, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM users'),
    ]);
    return {
      data: usersResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    };
  },

  async resetPassword(userId) {
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_change_required = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );
    return tempPassword;
  },

  async remove(userId) {
    if (userId === GLOBAL_ADMIN_ID) {
      return { forbidden: true };
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return { forbidden: false };
  },
};
