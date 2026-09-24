import type { Order } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { activeOrder, countDrinks, pastOrders, summariseLines } from './orders';

const line = (itemId: string, name: string, quantity: number) => ({
  itemId,
  name,
  unitPriceCents: 700,
  quantity,
  customisations: [],
});

const order = (id: string, status: Order['status'], placedAt: string): Order => ({
  id,
  storeId: 's',
  lines: [line('a', 'A', 1)],
  totalCents: 700,
  status,
  placedAt,
  updatedAt: placedAt,
  pickupCode: 'ABCD',
});

describe('activeOrder', () => {
  it('returns the order that is received, making or ready', () => {
    const orders = [
      order('done', 'collected', '2026-09-24T03:00:00.000Z'),
      order('live', 'making', '2026-09-24T02:00:00.000Z'),
    ];
    expect(activeOrder(orders)?.id).toBe('live');
  });

  it('is null when nothing is in progress', () => {
    expect(activeOrder([order('x', 'cancelled', '2026-09-24T02:00:00.000Z')])).toBeNull();
  });
});

describe('pastOrders', () => {
  it('returns finished orders newest first', () => {
    const orders = [
      order('old', 'collected', '2026-09-23T02:00:00.000Z'),
      order('live', 'ready', '2026-09-24T04:00:00.000Z'),
      order('new', 'cancelled', '2026-09-24T02:00:00.000Z'),
    ];
    expect(pastOrders(orders).map((o) => o.id)).toEqual(['new', 'old']);
  });
});

describe('summariseLines and countDrinks', () => {
  it('writes quantities with names', () => {
    const lines = [line('a', 'Signature Milk Tea', 2), line('b', 'Matcha Latte', 1)];
    expect(summariseLines(lines)).toBe('2 × Signature Milk Tea, 1 × Matcha Latte');
    expect(countDrinks(lines)).toBe(3);
  });
});
