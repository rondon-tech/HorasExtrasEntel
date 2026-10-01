import { describe, it, expect } from 'vitest';
import { darkenHex } from './color';

describe('darkenHex', () => {
  it('oscurece a la mitad por defecto', () => {
    expect(darkenHex('#34d399', 0.5)).toBe('#1a6a4d');
  });

  it('amount 0 deja igual y 1 lleva a negro', () => {
    expect(darkenHex('#60a5fa', 0)).toBe('#60a5fa');
    expect(darkenHex('#60a5fa', 1)).toBe('#000000');
  });

  it('acepta formato corto y devuelve el original si es inválido', () => {
    expect(darkenHex('#fff', 0.5)).toBe('#808080');
    expect(darkenHex('no-color', 0.5)).toBe('no-color');
  });
});
