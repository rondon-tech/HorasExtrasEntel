import winston from 'winston';

const transports = [];

if (!process.env.VERCEL) {
  transports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  transports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
}

const withMeta = winston.format.printf((info) => {
  const { level, message, timestamp, stack, ...meta } = info;
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return timestamp + ' ' + level + ': ' + (stack || message) + metaStr;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.VERCEL
    ? winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        withMeta
      ),
  transports,
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      withMeta
    )
  }));
}