import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up PostgreSQL connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Handle idle connection errors (Neon closes idle connections)
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize database tables
const initDB = async () => {
  try {
    await pool.query(`
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

      ALTER TABLE records ADD COLUMN IF NOT EXISTS numero_tarea VARCHAR(100) DEFAULT '';

      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        nemonico VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

      ALTER TABLE params ADD COLUMN IF NOT EXISTS asignacion_alimentacion INTEGER DEFAULT 91401;
      ALTER TABLE params ADD COLUMN IF NOT EXISTS desgaste_herramientas INTEGER DEFAULT 20000;
      ALTER TABLE params ADD COLUMN IF NOT EXISTS cuota_sindicato INTEGER DEFAULT 6392;
      ALTER TABLE params ADD COLUMN IF NOT EXISTS prestamo INTEGER DEFAULT 10000;
      ALTER TABLE params ADD COLUMN IF NOT EXISTS otros_descuentos INTEGER DEFAULT 0;
    `);
    
    // Ensure default params exist
    const { rowCount } = await pool.query('SELECT 1 FROM params WHERE id = 1');
    if (rowCount === 0) {
      await pool.query('INSERT INTO params (id) VALUES (1)');
    }
    
    console.log('Database tables initialized.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};
initDB();

// --- Endpoints for Params ---
app.get('/api/params', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM params WHERE id = 1');
    if (rows.length > 0) {
      const dbParams = rows[0];
      const params = {
        baseSalary: Number(dbParams.sueldo_base),
        gratificacion: Number(dbParams.gratificacion),
        incentivoProduccion: Number(dbParams.incentivo_produccion),
        weeklyHours: Number(dbParams.horas_jornada),
        tadRate: Number(dbParams.bono_tad),
        contingencyRate: Number(dbParams.bono_contingencia),
        viaticoRate: Number(dbParams.viatico_rate),
        afpRate: Number(dbParams.afp_rate),
        saludRate: Number(dbParams.salud_rate),
        cesantiaRate: Number(dbParams.cesantia_rate),
        asignacionAlimentacion: Number(dbParams.asignacion_alimentacion || dbParams.haberes_exentos || 91401),
        desgasteHerramientas: Number(dbParams.desgaste_herramientas || 20000),
        cuotaSindicato: Number(dbParams.cuota_sindicato || dbParams.descuentos_varios || 6392),
        prestamo: Number(dbParams.prestamo || 10000),
        otrosDescuentos: Number(dbParams.otros_descuentos || 0)
      };
      res.json(params);
    } else {
      res.status(404).json({ error: 'Params not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/params', async (req, res) => {
  try {
    const {
      baseSalary, gratificacion, incentivoProduccion, weeklyHours,
      tadRate, contingencyRate, viaticoRate,
      afpRate, saludRate, cesantiaRate,
      asignacionAlimentacion, desgasteHerramientas, cuotaSindicato, prestamo, otrosDescuentos
    } = req.body;

    await pool.query(`
      UPDATE params SET 
        sueldo_base = $1, gratificacion = $2, incentivo_produccion = $3, horas_jornada = $4,
        bono_tad = $5, bono_contingencia = $6, viatico_rate = $7,
        afp_rate = $8, salud_rate = $9, cesantia_rate = $10,
        asignacion_alimentacion = $11, desgaste_herramientas = $12,
        cuota_sindicato = $13, prestamo = $14, otros_descuentos = $15
      WHERE id = 1
    `, [
      baseSalary, gratificacion, incentivoProduccion, weeklyHours,
      tadRate, contingencyRate, viaticoRate,
      afpRate, saludRate, cesantiaRate,
      asignacionAlimentacion, desgasteHerramientas, cuotaSindicato, prestamo, otrosDescuentos
    ]);
    res.json({ message: 'Params updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Endpoints for Records ---
app.get('/api/records', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM records ORDER BY date DESC, start_time DESC');
    const mapped = rows.map(r => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0], // yyyy-mm-dd
      dayType: r.day_type,
      isFeriado: r.is_feriado,
      isContingencia: r.is_contingencia,
      startTime: r.start_time.substring(0, 5), // HH:mm
      endTime: r.end_time.substring(0, 5),
      sitio: r.sitio,
      numeroTarea: r.numero_tarea,
      tarea: r.tarea,
      extraHours: Number(r.extra_hours)
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const { date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO records (date, day_type, is_feriado, is_contingencia, start_time, end_time, sitio, numero_tarea, tarea, extra_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
    `, [date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours]);
    res.json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours } = req.body;
    await pool.query(`
      UPDATE records SET 
        date = $1, day_type = $2, is_feriado = $3, is_contingencia = $4,
        start_time = $5, end_time = $6, sitio = $7, numero_tarea = $8, tarea = $9, extra_hours = $10
      WHERE id = $11
    `, [date, dayType, isFeriado, isContingencia, startTime, endTime, sitio, numeroTarea, tarea, extraHours, id]);
    res.json({ message: 'Record updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM records WHERE id = $1', [id]);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Endpoints for Expenses ---
app.get('/api/expenses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const mapped = rows.map(e => ({
      id: e.id,
      date: e.date.toISOString().split('T')[0],
      nemonico: e.nemonico,
      description: e.description
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { date, nemonico, description } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO expenses (date, nemonico, description)
      VALUES ($1, $2, $3) RETURNING id
    `, [date, nemonico, description]);
    res.json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, nemonico, description } = req.body;
    await pool.query(`
      UPDATE expenses SET date = $1, nemonico = $2, description = $3
      WHERE id = $4
    `, [date, nemonico, description, id]);
    res.json({ message: 'Expense updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
