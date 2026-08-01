import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const transports = [];

// In serverless environments (like Vercel), the filesystem is read-only except for /tmp.
// So we only use File transports if we are NOT on Vercel.
if (!process.env.VERCEL) {
  transports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  transports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Allow logging Error objects with stack traces
    logFormat
  ),
  transports
});

// Always add Console transport in dev, OR if we are on Vercel (since it's the only way to log)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    )
  }));
}
