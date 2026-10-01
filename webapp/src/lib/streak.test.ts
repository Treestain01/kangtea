import type { Order } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { weeklyStreak } from './streak';

const collected = (placedAt: string, status: Order['status'] = 'collected'): Order => ({
  id: placedAt,
  storeId: 's',
  lines: [],
  totalCents: 0,
  status,
  placedAt,
  updatedAt: placedAt,
  pickupCode: 'ABCD',
});

// Thursday 1 October 2026.
const now = new Date('2026-10-01T05:00:00.000Z');

describe('weeklyStreak', () => {
  it('is zero with nothing collected', () => {
    expect(weeklyStreak([], now)).toBe(0);
    expect(weeklyStreak([collected('2026-09-30T02:00:00.000Z', 'cancelled')], now)).toBe(0);
  });

  it('counts consecutive weeks ending this week', () => {
    const orders = [
      collected('2026-09-29T02:00:00.000Z'),
      collected('2026-09-22T02:00:00.000Z'),
      collected('2026-09-16T02:00:00.000Z'),
      collected('2026-09-01T02:00:00.000Z'),
    ];
    expect(weeklyStreak(orders, now)).toBe(3);
  });

  it('keeps a streak alive through the current week until it ends', () => {
    const orders = [collected('2026-09-24T02:00:00.000Z'), collected('2026-09-17T02:00:00.000Z')];
    expect(weeklyStreak(orders, now)).toBe(2);
    expect(weeklyStreak(orders, new Date('2026-10-08T05:00:00.000Z'))).toBe(0);
  });
});
