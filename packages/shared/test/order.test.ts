import { describe, expect, it } from 'vitest';
import {
  CustomisationSchema,
  OrderLineSchema,
  OrderSchema,
  orderLinesTotalCents,
  orderTotalCents,
} from '../src/index.js';

const signature = {
  itemId: 'signature-milk-tea',
  name: 'Signature Milk Tea',
  unitPriceCents: 750,
  quantity: 2,
  customisations: [],
};
const matcha = {
  itemId: 'matcha-latte',
  name: 'Matcha Latte',
  unitPriceCents: 790,
  quantity: 1,
  customisations: [],
};

const order = {
  id: 'ord-1',
  storeId: 'calamvale-central',
  lines: [signature, matcha],
  totalCents: 2290,
  status: 'received',
  placedAt: '2026-09-24T02:00:00.000Z',
  updatedAt: '2026-09-24T02:00:00.000Z',
  pickupCode: 'K7PQ',
};

describe('orderLinesTotalCents', () => {
  it('sums unit price times quantity', () => {
    expect(orderLinesTotalCents([signature, matcha])).toBe(2290);
  });

  it('is zero for no lines', () => {
    expect(orderLinesTotalCents([])).toBe(0);
  });
});

describe('OrderLineSchema', () => {
  it('accepts a line', () => {
    expect(OrderLineSchema.safeParse(signature).success).toBe(true);
  });

  it('rejects a zero quantity', () => {
    expect(OrderLineSchema.safeParse({ ...signature, quantity: 0 }).success).toBe(false);
  });

  it('accepts a customisation with a quantity of two or more and rejects zero', () => {
    expect(
      CustomisationSchema.safeParse({ name: 'Topping', value: 'Pearls', quantity: 2 }).success,
    ).toBe(true);
    expect(
      CustomisationSchema.safeParse({ name: 'Topping', value: 'Pearls', quantity: 0 }).success,
    ).toBe(false);
    expect(
      CustomisationSchema.safeParse({ name: 'Topping', value: 'Pearls', quantity: 1.5 }).success,
    ).toBe(false);
  });

  it('accepts a customisation', () => {
    const line = { ...signature, customisations: [{ name: 'Size', value: 'Large' }] };
    expect(OrderLineSchema.safeParse(line).success).toBe(true);
  });
});

describe('OrderSchema', () => {
  it('accepts a consistent order', () => {
    expect(OrderSchema.safeParse(order).success).toBe(true);
  });

  it('rejects a total that does not match the lines', () => {
    const result = OrderSchema.safeParse({ ...order, totalCents: 2000 });
    expect(result.success).toBe(false);
  });

  it('rejects an order with no lines', () => {
    expect(OrderSchema.safeParse({ ...order, lines: [], totalCents: 0 }).success).toBe(false);
  });

  it('rejects a lowercase pickup code', () => {
    expect(OrderSchema.safeParse({ ...order, pickupCode: 'k7pq' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(OrderSchema.safeParse({ ...order, status: 'paid' }).success).toBe(false);
  });

  it('accepts every lifecycle status', () => {
    for (const status of ['received', 'making', 'ready', 'collected', 'cancelled']) {
      expect(OrderSchema.safeParse({ ...order, status }).success).toBe(true);
    }
  });
});

describe('free drink on an order', () => {
  const line = {
    itemId: 'milo',
    name: 'Milo',
    unitPriceCents: 800,
    quantity: 2,
    customisations: [],
  };
  const base = {
    id: 'o1',
    storeId: 's',
    lines: [line],
    status: 'received',
    placedAt: '2026-10-03T01:00:00.000Z',
    updatedAt: '2026-10-03T01:00:00.000Z',
    pickupCode: 'ABCD',
  };

  it('takes the free drink off the total', () => {
    expect(orderTotalCents([line], { lineIndex: 0, cents: 700 })).toBe(900);
    expect(orderTotalCents([line])).toBe(1600);
    const result = OrderSchema.safeParse({
      ...base,
      totalCents: 900,
      freeDrink: { lineIndex: 0, cents: 700 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a total that ignores the free drink, or a free drink that names no line', () => {
    expect(
      OrderSchema.safeParse({ ...base, totalCents: 1600, freeDrink: { lineIndex: 0, cents: 700 } })
        .success,
    ).toBe(false);
    expect(
      OrderSchema.safeParse({ ...base, totalCents: 900, freeDrink: { lineIndex: 3, cents: 700 } })
        .success,
    ).toBe(false);
    expect(
      OrderSchema.safeParse({ ...base, totalCents: 700, freeDrink: { lineIndex: 0, cents: 900 } })
        .success,
    ).toBe(false);
  });
});
