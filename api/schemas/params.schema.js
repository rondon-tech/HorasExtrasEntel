import { z } from 'zod';

export const paramsSchema = z.object({
  body: z.object({
    baseSalary: z.number().min(0),
    gratificacion: z.number().min(0),
    incentivoProduccion: z.number().min(0),
    weeklyHours: z.number().min(1).max(168),
    tadRate: z.number().min(0),
    contingencyRate: z.number().min(0),
    viaticoRate: z.number().min(0),
    afpRate: z.number().min(0).max(100),
    saludRate: z.number().min(0).max(100),
    cesantiaRate: z.number().min(0).max(100),
    asignacionAlimentacion: z.number().min(0),
    desgasteHerramientas: z.number().min(0),
    cuotaSindicato: z.number().min(0),
    prestamo: z.number().min(0),
    otrosDescuentos: z.number().min(0)
  })
});
