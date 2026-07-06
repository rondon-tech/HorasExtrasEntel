import { z } from 'zod';

export const recordSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
    dayType: z.enum(['Normal', 'TAD', 'TAD Apoyo']),
    isFeriado: z.boolean().optional(),
    isContingencia: z.boolean().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, expected HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, expected HH:MM'),
    sitio: z.string().min(1, 'Sitio is required'),
    numeroTarea: z.string().optional(),
    tarea: z.string().min(1, 'Tarea is required'),
    extraHours: z.number().min(0, 'Extra hours must be non-negative'),
  })
});
