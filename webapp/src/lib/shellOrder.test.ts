import type { Order } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { shellOrderMessage } from './shellOrder';

const order = (status: Order['status']): Order => ({
  id: 'o1',
  storeId: 's',
  lines: [
    { itemId: 'milo', name: 'Milo', unitPriceCents: 700, quantity: 1, customisations: [] },
    { itemId: 'x', name: 'Other', unitPriceCents: 700, quantity: 1, customisations: [] },
  ],
  totalCents: 1400,
  status,
  placedAt: '2026-10-02T01:00:00.000Z',
  updatedAt: '2026-10-02T01:00:00.000Z',
  pickupCode: 'ABCD',
});
const schedule = { makingAfterMs: 20_000, readyAfterMs: 60_000 };

describe('shellOrderMessage', () => {
  it('describes an active order with the first drink, the store and the ready time', () => {
    expect(shellOrderMessage(order('making'), null, schedule)).toEqual({
      type: 'orderStatus',
      status: 'making',
      itemName: 'Milo',
      storeName: 'Kang Tea',
      placedAt: '2026-10-02T01:00:00.000Z',
      readyAt: '2026-10-02T01:01:00.000Z',
    });
  });

  it('ends the activity when there is no active order', () => {
    expect(shellOrderMessage(null, null, schedule)).toEqual({ type: 'orderEnded' });
    expect(shellOrderMessage(order('collected'), null, schedule)).toEqual({ type: 'orderEnded' });
  });
});
