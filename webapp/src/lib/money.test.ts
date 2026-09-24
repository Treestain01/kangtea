import { describe, expect, it } from 'vitest';
import { formatPrice } from './money';

describe('formatPrice', () => {
  it('formats whole dollars with cents', () => {
    expect(formatPrice(700)).toBe('$7.00');
  });

  it('formats cents', () => {
    expect(formatPrice(1245)).toBe('$12.45');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
});
