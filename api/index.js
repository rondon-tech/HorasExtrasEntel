import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger } from '../server/utils/logger.js';
import { errorHandler } from '../server/middlewares/errorHandler.js';
import { getConfig } from '../server/config/env.js';

// Global rate limiter: 200 requests per IP per minute across all endpoints
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente de nuevo en un minuto.' },
});

// Attempt to load config early — if it fails we serve a clear error JSON
// instead of an opaque 500 Internal Server Error from Vercel.
let env = null;
let configError = null;
try {
  env = getConfig();
} catch (err) {
  configError = err;
}

const app = express();
app.set('trust proxy', 1);
app.use(globalLimiter);
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
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '1mb' }));

// If critical env vars are missing, mount an emergency-only app that
// returns a descriptive JSON error for every route.
if (configError) {
  app.use(cors());
  app.all('*', (_req, res) => {
    res.status(500).json({
      error: 'Server configuration error',
      message: configError.message,
      hint: 'Set the required environment variables (JWT_SECRET, ADMIN_USER, ADMIN_PASSWORD, FRONTEND_URL) in your Vercel project settings or .env file.',
    });
  });
  logger.error(`FATAL: ${configError.message}`);
} else {
  // Defer heavy imports until we know config is valid — avoids cascading
  // "cannot find module" errors when the real problem is just missing env vars.
  const authRouterModule = await import('../server/routes/auth.routes.js');
  const { expenseRouter } = await import('../server/routes/expense.routes.js');
  const { recordRouter } = await import('../server/routes/record.routes.js');
  const { paramsRouter } = await import('../server/routes/params.routes.js');
  const { payrollController } = await import('../server/controllers/payroll.controller.js');
  const { requireAuth } = await import('../server/middlewares/auth.js');
  const { pool } = await import('../server/config/db.js');

  const { authRouter } = authRouterModule;

  // Strict CORS: allow localhost for dev, FRONTEND_URL for prod,
  // and Vercel preview/git-branch deployment URLs (e.g. *.vercel.app).
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
  ].filter(Boolean);
  if (env.FRONTEND_URL) allowedOrigins.push(env.FRONTEND_URL);

  app.use(cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // Log all incoming requests
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  app.use('/api', authRouter);
  app.use('/api/params', paramsRouter);
  app.get('/api/payroll/:year/:month', requireAuth, payrollController.get);
  app.use('/api/records', recordRouter);
  app.use('/api/expenses', expenseRouter);

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(503).json({ status: 'unhealthy', error: err.message });
    }
  });
}

app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;