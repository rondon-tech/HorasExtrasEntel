import { pool } from '../config/db.js';
import { toExpenseDTO } from '../mappers/index.js';

/**
 * Expenses Repository — PostgresSQL data access for expenses.
 */
export const expenseRepository = {
  async findAll(userId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return rows.map(toExpenseDTO);
  },

  async countTotal(userId) {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM expenses WHERE user_id = $1', [userId]);
    return Number(rows[0].count);
  },

  async create(userId, { date, nemonico, description }) {
    const { rows } = await pool.query(
      'INSERT INTO expenses (user_id, date, nemonico, description) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, date, nemonico, description]
    );
    return rows[0].id;
  },

  async update(userId, id, { date, nemonico, description }) {
    await pool.query(
      'UPDATE expenses SET date = $1, nemonico = $2, description = $3 WHERE id = $4 AND user_id = $5',
      [date, nemonico, description, id, userId]
    );
  },

  async remove(userId, id) {
    await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  /** Expenses for a specific year / month (used by payroll). Rows are NOT mapped to DTO. */
  async findByMonth(userId, year, month) {
    const { rows } = await pool.query(
      `SELECT * FROM expenses
       WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
      [userId, year, month]
    );
    return rows;
  },
};
