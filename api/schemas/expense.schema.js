import { z } from 'zod';

export const expenseSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
    nemonico: z.string().min(1, 'Nemonico is required'),
    description: z.string().min(1, 'Description is required'),
  })
});
