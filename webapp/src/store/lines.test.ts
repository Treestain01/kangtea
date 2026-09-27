import { describe, expect, it } from 'vitest';
import {
  buildCartLine,
  describeCustomisation,
  lineKey,
  summariseCustomisations,
  unitPriceCents,
} from './lines';
import { menuItemFixture } from './testing';

const item = menuItemFixture();
const sugar50 = { id: 'sugar-50', name: '50%', isDefault: false };
const lessIce = { id: 'ice-less', name: 'Less ice', isDefault: false };
const pearls = { id: 'pearls', name: 'Pearls', priceCents: 80 };
const pudding = { id: 'pudding', name: 'Pudding', priceCents: 100 };
const one = (topping: typeof pearls) => ({ topping, quantity: 1 });

describe('unitPriceCents', () => {
  it('adds topping prices to the drink price', () => {
    expect(unitPriceCents(item, [one(pearls), one(pudding)])).toBe(930);
    expect(unitPriceCents(item, [])).toBe(750);
  });

  it('charges every lot of a topping', () => {
    expect(unitPriceCents(item, [{ topping: pearls, quantity: 3 }])).toBe(750 + 240);
  });
});

describe('buildCartLine', () => {
  it('records sugar, ice and each topping as customisations with the toppings priced in', () => {
    const line = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [one(pearls), one(pudding)],
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

  it('keeps the quantity on a topping added more than once', () => {
    const line = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [{ topping: pearls, quantity: 2 }, one(pudding)],
      quantity: 1,
    });
    expect(line.unitPriceCents).toBe(750 + 160 + 100);
    expect(line.customisations).toEqual([
      { name: 'Sugar', value: '50%' },
      { name: 'Ice', value: 'Less ice' },
      { name: 'Topping', value: 'Pearls', quantity: 2 },
      { name: 'Topping', value: 'Pudding' },
    ]);
  });
});

describe('describeCustomisation', () => {
  it('shows the count only when it is more than one', () => {
    expect(describeCustomisation({ name: 'Topping', value: 'Pearls' })).toBe('Pearls');
    expect(describeCustomisation({ name: 'Topping', value: 'Pearls', quantity: 1 })).toBe('Pearls');
    expect(describeCustomisation({ name: 'Topping', value: 'Pearls', quantity: 2 })).toBe(
      'Pearls ×2',
    );
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
      toppings: [one(pearls)],
      quantity: 1,
    });
    const b = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [one(pearls)],
      quantity: 3,
    });
    const c = buildCartLine(item, { sugar: sugar50, ice: lessIce, toppings: [], quantity: 1 });
    expect(lineKey(a)).toBe(lineKey(b));
    expect(lineKey(a)).not.toBe(lineKey(c));
  });

  it('tells one lot of a topping from two', () => {
    const single = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [one(pearls)],
      quantity: 1,
    });
    const double = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [{ topping: pearls, quantity: 2 }],
      quantity: 1,
    });
    expect(lineKey(single)).not.toBe(lineKey(double));
  });
});

describe('summariseCustomisations', () => {
  it('joins sugar, ice and toppings, with counts above one', () => {
    const line = buildCartLine(item, {
      sugar: sugar50,
      ice: lessIce,
      toppings: [{ topping: pearls, quantity: 2 }, one(pudding)],
      quantity: 1,
    });
    expect(summariseCustomisations(line)).toBe('50% · Less ice · Pearls ×2, Pudding');
  });

  it('is empty for a plain line', () => {
    expect(summariseCustomisations({ customisations: [] })).toBe('');
  });
});
