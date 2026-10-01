/**
 * Oscurece un color hexadecimal hacia el negro.
 * Uso: acentos diseñados para fondo oscuro reutilizados en modo claro.
 * darkenHex('#34d399', 0.5) → '#1a6a4d'
 */
export function darkenHex(hex: string, amount = 0.5): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 255) * (1 - amount));
  const g = clamp(((num >> 8) & 255) * (1 - amount));
  const b = clamp((num & 255) * (1 - amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
