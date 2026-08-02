import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Auth rejected - no Bearer token:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
    });
    return res.status(401).json({ error: 'No autorizado: Token de acceso no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { JWT_SECRET } = getConfig();
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Auth rejected - invalid token:', {
      path: req.path,
      method: req.method,
      error: err.message,
    });
    return res.status(401).json({ error: 'No autorizado: Token inválido o expirado' });
  }
};
