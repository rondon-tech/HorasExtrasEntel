import { describe, it, expect } from 'vitest';
import { Money } from './money.js';

describe('Money utility', () => {
  it('should store values as integers', () => {
    const m = new Money(100.5);
    expect(m.amount).toBe(101); // Math.round
  });

  it('should add amounts safely', () => {
    const m1 = new Money(100);
    const m2 = new Money(50);
    const result = m1.add(m2);
    expect(result.amount).toBe(150);
  });

  it('should subtract amounts safely', () => {
    const m1 = new Money(100);
    const m2 = new Money(40);
    const result = m1.subtract(m2);
    expect(result.amount).toBe(60);
  });

  it('should calculate percentages securely without float precision errors', () => {
    // Standard float issue: 1000 * 0.1127 = 112.7. 
    // Wait, 0.1 + 0.2
    const base = new Money(1000);
    const result = base.multiply(0.1127);
    expect(result.amount).toBe(113); // Round of 112.7
  });

  it('should handle division and rounding', () => {
    const m1 = new Money(1000);
    const result = m1.divide(3);
    expect(result.amount).toBe(333); // 333.33 -> 333
  });
});
