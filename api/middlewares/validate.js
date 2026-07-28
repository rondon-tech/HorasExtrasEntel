import { z } from 'zod';
import xss from 'xss';

/**
 * Recursively sanitize string values in an object or array.
 * Only sanitizes strings; passes through everything else.
 */
function sanitizeStrings(data) {
  if (typeof data === 'string') {
    return xss(data);
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
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Sanitize all string values to prevent XSS via stored data
    const sanitized = sanitizeStrings(parsed);

    // Overwrite the parsed fields with sanitized versions so controllers receive clean data
    req.body = sanitized.body;
    req.query = sanitized.query;
    req.params = sanitized.params;

    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.errors,
      });
    }
    return res.status(500).json({ error: 'Internal Server Error during validation' });
  }
};
