import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  
  const errorDetails = {
    message: err.message,
    code: err.code,
    detail: err.detail,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    userId: req.user?.id,
  };

  logger.error('Request error:', errorDetails);

  const errorResponse = {
    error: 'Error interno del servidor',
    message: err.message || 'Ocurrió un error inesperado.',
    code: err.code,
    detail: err.detail,
  };

  res.status(statusCode).json(errorResponse);
};
