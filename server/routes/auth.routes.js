import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../schemas/auth.schema.js';
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

router.post('/login', loginLimiter, validate(loginSchema), authController.login);

export { router as authRouter };
