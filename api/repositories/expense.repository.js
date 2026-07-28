import { pool } from '../config/db.js';
import { toExpenseDTO } from '../mappers/index.js';

/**
 * Expenses Repository — PostgresSQL data access for expenses.
 */
export const expenseRepository = {
  async findAll() {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    return rows.map(toExpenseDTO);
  },

  async create({ date, nemonico, description }) {
    const { rows } = await pool.query(
      'INSERT INTO expenses (date, nemonico, description) VALUES ($1, $2, $3) RETURNING id',
      [date, nemonico, description]
    );
    return rows[0].id;
  },

  async update(id, { date, nemonico, description }) {
    await pool.query(
      'UPDATE expenses SET date = $1, nemonico = $2, description = $3 WHERE id = $4',
      [date, nemonico, description, id]
    );
  },

  async remove(id) {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
  },

  /** Expenses for a specific year / month (used by payroll). Rows are NOT mapped to DTO. */
  async findByMonth(year, month) {
    const { rows } = await pool.query(
      `SELECT * FROM expenses
       WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month]
    );
    return rows;
  },
};
