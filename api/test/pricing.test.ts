import type { Menu, OrderLine } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { priceLines, PricingError } from '../src/payments/pricing.js';

const menu: Menu = {
  categories: [{ id: 'fruit-tea', name: 'Fruit Tea', sortOrder: 0 }],
  items: [
    {
      id: 'orange-green-tea',
      categoryId: 'fruit-tea',
      name: 'Orange Green Tea',
      priceCents: 800,
      currency: 'AUD',
      tags: [],
      colour: '#F0A640',
      pearls: false,
    },
  ],
  customisations: {
    sugarLevels: [{ id: 'sugar-100', name: '100%', isDefault: true }],
    iceLevels: [{ id: 'ice-standard', name: 'Standard ice', isDefault: true }],
    toppings: [
      { id: 'boba', name: 'Boba', priceCents: 100 },
      { id: 'milk-foam', name: 'Milk Foam', priceCents: 150 },
    ],
  },
};

const line = (overrides: Partial<OrderLine> = {}): OrderLine => ({
  itemId: 'orange-green-tea',
  name: 'Orange Green Tea',
  unitPriceCents: 800,
  quantity: 1,
  customisations: [],
  ...overrides,
});

describe('priceLines', () => {
  it('prices a plain line from the menu, not from the client', () => {
    expect(priceLines(menu, [line({ unitPriceCents: 1 })])).toBe(800);
  });

  it('adds toppings by name, times their lots, times the line quantity', () => {
    const priced = priceLines(menu, [
      line({
        quantity: 2,
        customisations: [
          { name: 'Sugar', value: '100%' },
          { name: 'Topping', value: 'Boba', quantity: 2 },
          { name: 'Topping', value: 'Milk Foam' },
        ],
      }),
    ]);
    expect(priced).toBe((800 + 200 + 150) * 2);
  });

  it('takes the free drink base price off, toppings still charged', () => {
    const cart = [line({ customisations: [{ name: 'Topping', value: 'Boba' }] })];
    expect(priceLines(menu, cart, { lineIndex: 0, cents: 800 })).toBe(100);
  });

  it('never prices below zero', () => {
    expect(priceLines(menu, [line()], { lineIndex: 0, cents: 800 })).toBe(0);
  });

  it('throws for a drink or topping the menu does not know', () => {
    expect(() => priceLines(menu, [line({ itemId: 'retired' })])).toThrow(PricingError);
    expect(() =>
      priceLines(menu, [line({ customisations: [{ name: 'Topping', value: 'Gold Leaf' }] })]),
    ).toThrow(PricingError);
  });

  it('throws when the free drink names a line that is not there', () => {
    expect(() => priceLines(menu, [line()], { lineIndex: 3, cents: 800 })).toThrow(PricingError);
  });
});
