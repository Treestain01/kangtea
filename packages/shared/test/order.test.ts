import { describe, expect, it } from 'vitest';
import { OrderLineSchema, OrderSchema, orderLinesTotalCents } from '../src/index.js';

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
