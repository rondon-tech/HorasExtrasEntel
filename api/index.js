import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authRouter } from './routes/auth.routes.js';
import { pool } from './config/db.js';
import { requireAuth } from './middlewares/auth.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { getConfig } from './config/env.js';
import { expenseRouter } from './routes/expense.routes.js';
import { recordRouter } from './routes/record.routes.js';
import { paramsRouter } from './routes/params.routes.js';
import { payrollController } from './controllers/payroll.controller.js';

const app = express();

// Trust the first proxy (Neon serverless / Vercel) so rate-limiting and
// helmet headers work with the original client IP.
// In Vercel, the deployment infrastructure provides the "x-forwarded-*" headers.
app.set('trust proxy', 1);

// Security headers via Helmet, with a Content-Security-Policy tuned to the app.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Gzip compression for responses > 1KB
app.use(compression({ threshold: 1024 }));

// Validate required environment variables at startup. getConfig() throws if
// any critical variable is missing, preventing the server from running with
// insecure hardcoded fallbacks.
const env = getConfig();

// Strict CORS: allow localhost for dev, and FRONTEND_URL for prod.
const allowedOrigins = [
  'http://localhost:5173',
  env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Non-browser requests (curl, Postman) or same-origin requests have no origin header.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Log all incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// --- Authentication Router (rate-limited login) ---
app.use('/api', authRouter);

// PostgreSQL connection pool is managed by api/config/db.js.
// It validates env vars, configures SSL, and handles idle-client errors.

// Schema migrations should be run BEFORE deploy:
//   npm run migrate          (apply pending migrations)
//   npm run migrate:down     (rollback last migration)
// See migrate.mjs and api/migrations/ for details.
// DEPRECATED: inline initDB() removed in favour of versioned migrations.

// --- Params Router ---
app.use('/api/params', paramsRouter);

// --- Payroll ---
app.get('/api/payroll/:year/:month', requireAuth, payrollController.get);

// --- Records Router ---
app.use('/api/records', recordRouter);

// --- Expenses Router ---
app.use('/api/expenses', expenseRouter);

// --- Health Check ---
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Mount the global error handler at the end
app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;
