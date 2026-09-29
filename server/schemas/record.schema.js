import { z } from 'zod';

export const recordSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
    dayType: z.enum(['Normal', 'TAD', 'TAD Apoyo']),
    isFeriado: z.boolean().optional(),
    isContingencia: z.boolean().optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario invalido: use HH:MM entre 00:00 y 23:59'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario invalido: use HH:MM entre 00:00 y 23:59'),
    sitio: z.string().min(1, 'Sitio is required'),
    numeroTarea: z.string().optional(),
    tarea: z.string().min(1, 'Tarea is required'),
    extraHours: z.number().min(0, 'Extra hours must be non-negative').max(12, 'No se pueden declarar más de 12 horas extras en un día (límite legal)'),
  })
  // Los registros de disposición/guardia (0 horas) usan 00:00/00:00 y no
  // necesitan horarios distintos; el resto sí (evita registros vacíos).
  .refine((data) => data.extraHours === 0 || data.startTime !== data.endTime, {
    message: 'La hora de inicio y fin no pueden ser iguales',
    path: ['endTime'],
  })
});
