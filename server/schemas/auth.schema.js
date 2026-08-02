import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'El usuario es requerido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  })
});

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').max(100, 'El usuario no puede exceder 100 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128, 'La contraseña no puede exceder 128 caracteres'),
  })
});
