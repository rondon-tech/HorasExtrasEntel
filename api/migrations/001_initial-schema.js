/**
 * Migration: 001 — Initial schema
 *
 * Creates the core tables: records, expenses, params.
 * Includes all columns present in the current deployed schema.
 */

export async function up(pgm) {
  // records
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      day_type VARCHAR(50) NOT NULL,
      is_feriado BOOLEAN DEFAULT FALSE,
      is_contingencia BOOLEAN DEFAULT FALSE,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      sitio VARCHAR(255) NOT NULL,
      tarea VARCHAR(255) NOT NULL,
      extra_hours NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  pgm.sql(`ALTER TABLE records ADD COLUMN IF NOT EXISTS numero_tarea VARCHAR(100) DEFAULT '';`);

  // expenses
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      nemonico VARCHAR(50) NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // params (single-row table)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS params (
      id INTEGER PRIMARY KEY DEFAULT 1,
      sueldo_base INTEGER NOT NULL DEFAULT 639908,
      gratificacion INTEGER NOT NULL DEFAULT 213354,
      incentivo_produccion INTEGER NOT NULL DEFAULT 203192,
      horas_jornada INTEGER NOT NULL DEFAULT 44,
      bono_tad INTEGER NOT NULL DEFAULT 9800,
      bono_contingencia INTEGER NOT NULL DEFAULT 9800,
      viatico_rate INTEGER NOT NULL DEFAULT 9800,
      afp_rate NUMERIC(10, 2) NOT NULL DEFAULT 11.27,
      salud_rate NUMERIC(10, 2) NOT NULL DEFAULT 7.00,
      cesantia_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.60,
      impuesto_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      asignacion_alimentacion INTEGER NOT NULL DEFAULT 91401,
      desgaste_herramientas INTEGER NOT NULL DEFAULT 20000,
      cuota_sindicato INTEGER NOT NULL DEFAULT 6392,
      prestamo INTEGER NOT NULL DEFAULT 10000
    );
  `);

  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS asignacion_alimentacion INTEGER DEFAULT 91401;`);
  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS desgaste_herramientas INTEGER DEFAULT 20000;`);
  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS cuota_sindicato INTEGER DEFAULT 6392;`);
  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS prestamo INTEGER DEFAULT 10000;`);
  pgm.sql(`ALTER TABLE params ADD COLUMN IF NOT EXISTS otros_descuentos INTEGER DEFAULT 0;`);

  // Seed default params row if table is empty
  pgm.sql(`
    INSERT INTO params (id)
    SELECT 1
    WHERE NOT EXISTS (SELECT 1 FROM params WHERE id = 1);
  `);

  // Performance indexes (T024)
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_records_date ON records (date);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_records_date_month ON records (EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));`);

  // Data integrity constraints (T025)
  pgm.sql(`
    ALTER TABLE records
    ADD CONSTRAINT IF NOT EXISTS chk_records_extra_hours CHECK (extra_hours >= 0);
  `);
  pgm.sql(`
    ALTER TABLE records
    ADD CONSTRAINT IF NOT EXISTS chk_records_day_type CHECK (day_type IN ('Normal', 'TAD', 'TAD Apoyo'));
  `);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_day_type;`);
  pgm.sql(`ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_extra_hours;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_records_date_month;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_expenses_date;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_records_date;`);
  pgm.sql(`DROP TABLE IF EXISTS expenses;`);
  pgm.sql(`DROP TABLE IF EXISTS records;`);
  pgm.sql(`DROP TABLE IF EXISTS params;`);
}
