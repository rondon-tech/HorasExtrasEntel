/**
 * Format a number as Chilean Peso (CLP) currency string.
 * Usage: formatCLP(1056454) → "$1.056.454"
 */
export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(value || 0);
}
