import { pool } from '../config/db.js';
import { toParamsDTO } from '../mappers/index.js';

export const paramsRepository = {
  async findFirst() {
    const { rows } = await pool.query('SELECT * FROM params WHERE id = 1');
    if (rows.length === 0) return null;
    return toParamsDTO(rows[0]);
  },

  async findFirstRaw() {
    const { rows } = await pool.query('SELECT * FROM params WHERE id = 1');
    return rows.length > 0 ? rows[0] : null;
  },

  async update(values) {
    await pool.query(
      `UPDATE params SET
         sueldo_base = $1, gratificacion = $2, incentivo_produccion = $3, horas_jornada = $4,
         bono_tad = $5, bono_contingencia = $6, viatico_rate = $7,
         afp_rate = $8, salud_rate = $9, cesantia_rate = $10,
         asignacion_alimentacion = $11, desgaste_herramientas = $12,
         cuota_sindicato = $13, prestamo = $14, otros_descuentos = $15,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      values
    );
  },
};
