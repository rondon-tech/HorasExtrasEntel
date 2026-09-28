import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Formatea 'YYYY-MM-DD' construyendo la fecha en hora local (sin desfase por zona horaria). */
export function formatShortDate(isoDate: string, pattern = "EEEE dd/MM"): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return format(new Date(y, m - 1, d), pattern, { locale: es });
}

/** Prefijo 'YYYY-MM' para filtrar registros del mes dado. */
export function monthPrefix(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
