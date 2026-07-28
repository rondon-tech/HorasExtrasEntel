/**
 * Utility for money-safe calculations (Integer arithmetic).
 * Represents amounts in the lowest currency unit (e.g., CLP integers).
 */
export class Money {
  /** Integer amount in the lowest currency unit. */
  amount: number;

  constructor(amount: number | string) {
    this.amount = Math.round(Number(amount));
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    return new Money(this.amount - other.amount);
  }

  /** Multiply by a float (e.g. a percentage) and round safely to integer. */
  multiply(rate: number): Money {
    return new Money(Math.round(this.amount * rate));
  }

  divide(divisor: number): Money {
    return new Money(Math.round(this.amount / divisor));
  }
}
