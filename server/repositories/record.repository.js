import { pool } from '../config/db.js';
import { toRecordDTO } from '../mappers/index.js';

export const recordRepository = {
  async findAll(userId, { limit = 50, offset = 0 } = {}) {
    const { rows } = await pool.query(
      'SELECT * FROM records WHERE user_id = $1 ORDER BY date DESC, start_time DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return rows.map(toRecordDTO);
  },

  async countTotal(userId) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM records WHERE user_id = $1', [userId]);
    return rows[0].total;
  },

  /**
   * @param {string} userId - UUID from JWT
   * @param {object} recordData
   * @returns {string} the UUID of the newly inserted record
   */
  async create(userId, recordData) {
    const { date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours } =
      recordData;
    const { rows } = await pool.query(
      `INSERT INTO records (user_id, date, day_type, is_feriado, is_contingencia, start_time, end_time, sitio, numero_tarea, tarea, extra_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [userId, date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours]
    );
    return rows[0].id;
  },

  async update(userId, id, recordData) {
    const { date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours } =
      recordData;
    await pool.query(
      `UPDATE records SET
         date = $1, day_type = $2, is_feriado = $3, is_contingencia = $4,
         start_time = $5, end_time = $6, sitio = $7, numero_tarea = $8, tarea = $9, extra_hours = $10
       WHERE id = $11 AND user_id = $12`,
      [date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours, id, userId]
    );
  },

  async remove(userId, id) {
    await pool.query('DELETE FROM records WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  /** Records for a specific year / month (used by payroll). Rows are NOT mapped to DTO. */
  async findByMonth(userId, year, month) {
    const { rows } = await pool.query(
      `SELECT * FROM records
       WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
      [userId, year, month]
    );
    return rows;
  },
};
