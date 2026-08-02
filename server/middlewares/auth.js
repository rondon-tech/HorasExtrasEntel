import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: Token de acceso no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { JWT_SECRET } = getConfig();
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'No autorizado: Token inválido o expirado' });
  }
};
