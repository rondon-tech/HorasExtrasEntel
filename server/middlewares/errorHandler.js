import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error using winston. It will log the stack trace automatically if we pass the error object.
  logger.error(err);

  // Determine the status code
  const statusCode = err.status || 500;
  
  // Create a safe error response. Never leak stack traces in production.
  const errorResponse = {
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' 
      ? 'Ocurrió un error inesperado. El equipo técnico ha sido notificado.'
      : err.message
  };

  res.status(statusCode).json(errorResponse);
};
