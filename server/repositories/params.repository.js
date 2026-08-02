import { pool } from '../config/db.js';
import { toParamsDTO } from '../mappers/index.js';

const DEFAULT_PARAMS = [
  639908, // sueldo_base
  213354, // gratificacion
  203192, // incentivo_produccion
  44,     // horas_jornada
  9800,   // bono_tad
  9800,   // bono_contingencia
  9800,   // viatico_rate
  11.27,  // afp_rate
  7.00,   // salud_rate
  0.60,   // cesantia_rate
  91401,  // asignacion_alimentacion
  20000,  // desgaste_herramientas
  6392,   // cuota_sindicato
  10000,  // prestamo
  0,      // otros_descuentos
];

export const paramsRepository = {
  async findByUserId(userId) {
    const { rows } = await pool.query('SELECT * FROM params WHERE user_id = $1', [userId]);
    if (rows.length === 0) return null;
    return toParamsDTO(rows[0]);
  },

  async findFirstRaw(userId) {
    const { rows } = await pool.query('SELECT * FROM params WHERE user_id = $1', [userId]);
    return rows.length > 0 ? rows[0] : null;
  },

  async update(userId, values) {
    await pool.query(
      `UPDATE params SET
         sueldo_base = $1, gratificacion = $2, incentivo_produccion = $3, horas_jornada = $4,
         bono_tad = $5, bono_contingencia = $6, viatico_rate = $7,
         afp_rate = $8, salud_rate = $9, cesantia_rate = $10,
         asignacion_alimentacion = $11, desgaste_herramientas = $12,
         cuota_sindicato = $13, prestamo = $14, otros_descuentos = $15,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $16`,
      [...values, userId]
    );
  },

  async createDefault(userId) {
    await pool.query(
      `INSERT INTO params (id, user_id, sueldo_base, gratificacion, incentivo_produccion, horas_jornada,
         bono_tad, bono_contingencia, viatico_rate, afp_rate, salud_rate, cesantia_rate,
         asignacion_alimentacion, desgaste_herramientas, cuota_sindicato, prestamo, otros_descuentos)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [userId, ...DEFAULT_PARAMS]
    );
  },
};
