import { z } from 'zod';
import xss from 'xss';
import { logger } from '../utils/logger.js';

/**
 * Recursively sanitize string values in an object or array.
 * Only sanitizes strings; passes through everything else.
 */
function sanitizeStrings(data) {
  if (typeof data === 'string') {
    try {
      return xss(data);
    } catch {
      return data;
    }
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeStrings);
  }
  if (data !== null && typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeStrings(value);
    }
    return result;
  }
  return data;
}

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: result.error.errors,
      body: req.body,
    });
    
    return res.status(400).json({
      error: 'Validation Error',
      details: result.error.errors,
    });
  }

  const sanitized = sanitizeStrings(result.data);

  req.body = sanitized.body;
  req.query = sanitized.query;
  req.params = sanitized.params;

  next();
};
