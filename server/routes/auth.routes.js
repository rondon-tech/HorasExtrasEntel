import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';
import { authController } from '../controllers/auth.controller.js';

const router = Router();

// Rate limiting: max 5 login attempts per IP in 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
});

// Rate limiting: max 3 registrations per IP per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de registro. Intente de nuevo en una hora.' },
});

router.post('/login', loginLimiter, authController.login);
router.post('/register', requireAuth, requireRole('global_admin'), registerLimiter, authController.register);
router.post('/change-password', requireAuth, authController.changePassword);

export { router as authRouter };
