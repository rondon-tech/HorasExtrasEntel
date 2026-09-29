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

/**
 * Abrevia un monto para etiquetas compactas (barras, badges).
 * Usage: abbreviateCLP(1500000) → "1.5M", abbreviateCLP(850000) → "850K"
 */
export function abbreviateCLP(value: number): string {
  const v = Math.round(value || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return String(v);
}
