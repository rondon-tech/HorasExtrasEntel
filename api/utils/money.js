/**
 * Utility for money-safe calculations (Integer arithmetic).
 * Represents amounts in the lowest currency unit (e.g., CLP integers).
 */
export class Money {
  constructor(amount) {
    // Ensure we are strictly dealing with integers
    this.amount = Math.round(Number(amount));
  }

  add(other) {
    return new Money(this.amount + other.amount);
  }

  subtract(other) {
    return new Money(this.amount - other.amount);
  }

  // Multiply by a float (like a percentage) and round safely to integer
  multiply(rate) {
    return new Money(Math.round(this.amount * rate));
  }

  divide(divisor) {
    return new Money(Math.round(this.amount / divisor));
  }
}
