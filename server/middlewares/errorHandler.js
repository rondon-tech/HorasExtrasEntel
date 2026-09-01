import { logger } from '../utils/logger.js';

const SENSITIVE_KEYS = ['password', 'oldPassword', 'newPassword', 'tempPassword', 'token', 'authorization'];

const redactBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const safe = { ...body };
  for (const key of Object.keys(safe)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      safe[key] = '[REDACTED]';
    }
  }
  return safe;
};

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.status || 500;
  const isClientError = statusCode < 500;

  logger.error('Request error:', {
    message: err.message,
    code: err.code,
    detail: isClientError ? err.detail : undefined,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: redactBody(req.body),
    userId: req.user?.id,
  });

  const errorResponse = isClientError
    ? {
        error: err.message || 'Error en la solicitud',
        ...(err.code ? { code: err.code } : {}),
      }
    : {
        error: 'Error interno del servidor',
      };

  res.status(statusCode).json(errorResponse);
};
