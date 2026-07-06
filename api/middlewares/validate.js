import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
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
