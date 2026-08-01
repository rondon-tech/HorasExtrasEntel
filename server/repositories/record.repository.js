import { pool } from '../config/db.js';
import { toRecordDTO } from '../mappers/index.js';

export const recordRepository = {
  async findAll({ limit = 50, offset = 0 } = {}) {
    const { rows } = await pool.query(
      'SELECT * FROM records ORDER BY date DESC, start_time DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows.map(toRecordDTO);
  },

  async countTotal() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM records');
    return rows[0].total;
  },

  /**
   * @returns {string} the UUID of the newly inserted record
   */
  async create(recordData) {
    const { date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours } =
      recordData;
    const { rows } = await pool.query(
      `INSERT INTO records (date, day_type, is_feriado, is_contingencia, start_time, end_time, sitio, numero_tarea, tarea, extra_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours]
    );
    return rows[0].id;
  },

  async update(id, recordData) {
    const { date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours } =
      recordData;
    await pool.query(
      `UPDATE records SET
         date = $1, day_type = $2, is_feriado = $3, is_contingencia = $4,
         start_time = $5, end_time = $6, sitio = $7, numero_tarea = $8, tarea = $9, extra_hours = $10
       WHERE id = $11`,
      [date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours, id]
    );
  },

  async remove(id) {
    await pool.query('DELETE FROM records WHERE id = $1', [id]);
  },

  /** Records for a specific year / month (used by payroll). Rows are NOT mapped to DTO. */
  async findByMonth(year, month) {
    const { rows } = await pool.query(
      `SELECT * FROM records
       WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month]
    );
    return rows;
  },
};
