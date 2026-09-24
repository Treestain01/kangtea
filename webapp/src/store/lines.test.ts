import { describe, expect, it } from 'vitest';
import { buildCartLine, lineKey, summariseCustomisations, unitPriceCents } from './lines';
import { menuItemFixture } from './testing';

const item = menuItemFixture();
const sugar50 = { id: 'sugar-50', name: '50%', isDefault: false };
const lessIce = { id: 'ice-less', name: 'Less ice', isDefault: false };
const pearls = { id: 'pearls', name: 'Pearls', priceCents: 80 };
const pudding = { id: 'pudding', name: 'Pudding', priceCents: 100 };

describe('unitPriceCents', () => {
  it('adds topping prices to the drink price', () => {
    expect(unitPriceCents(item, [pearls, pudding])).toBe(930);
    expect(unitPriceCents(item, [])).toBe(750);
  });
});

describe('buildCartLine', () => {
  it('records sugar, ice and each topping as customisations with the toppings priced in', () => {
    const line = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [pearls, pudding],
      quantity: 2,
    });
    expect(line).toEqual({
      itemId: 'signature-milk-tea',
      name: 'Signature Milk Tea',
      unitPriceCents: 930,
      quantity: 2,
      customisations: [
        { name: 'Sugar', value: '50%' },
        { name: 'Ice', value: 'Less ice' },
        { name: 'Topping', value: 'Pearls' },
        { name: 'Topping', value: 'Pudding' },
      ],
    });
  });
});

describe('lineKey', () => {
  it('is the item id for a plain line', () => {
    expect(lineKey({ itemId: 'a', customisations: [] })).toBe('a');
  });

  it('differs when customisations differ and matches when they are the same', () => {
    const a = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [pearls],
      quantity: 1,
    });
    const b = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [pearls],
      quantity: 3,
    });
    const c = buildCartLine(item, { sugar: sugar50, ice: lessIce, toppings: [], quantity: 1 });
    expect(lineKey(a)).toBe(lineKey(b));
    expect(lineKey(a)).not.toBe(lineKey(c));
  });
});

describe('summariseCustomisations', () => {
  it('joins sugar, ice and toppings', () => {
    const line = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [pearls, pudding],
      quantity: 1,
    });
    expect(summariseCustomisations(line)).toBe('50% · Less ice · Pearls, Pudding');
  });

  it('is empty for a plain line', () => {
    expect(summariseCustomisations({ customisations: [] })).toBe('');
  });
});
