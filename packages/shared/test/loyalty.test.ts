import { describe, expect, it } from 'vitest';
import { EarnStampsRequestSchema, LoyaltyCardSchema, STAMPS_PER_CARD } from '../src/index.js';

const stamp = (n: number) => ({
  id: `s${n}`,
  itemName: 'Milo',
  colour: '#6B4A3A',
  earnedAt: '2026-09-27T01:00:00.000Z',
});

describe('LoyaltyCardSchema', () => {
  it('accepts a card in progress', () => {
    const result = LoyaltyCardSchema.safeParse({
      stampsPerCard: STAMPS_PER_CARD,
      earned: 3,
      redeemed: 0,
      available: 0,
      complete: false,
      stamps: [stamp(1), stamp(2), stamp(3)],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full card with a free drink waiting', () => {
    const result = LoyaltyCardSchema.safeParse({
      stampsPerCard: STAMPS_PER_CARD,
      earned: 10,
      redeemed: 0,
      available: 1,
      complete: true,
      stamps: Array.from({ length: 10 }, (_, n) => stamp(n)),
    });
    expect(result.success).toBe(true);
  });

  it('rejects complete without a free drink, and more than ten stamps', () => {
    expect(
      LoyaltyCardSchema.safeParse({
        stampsPerCard: STAMPS_PER_CARD,
        earned: 2,
        redeemed: 0,
        available: 0,
        complete: true,
        stamps: [stamp(1), stamp(2)],
      }).success,
    ).toBe(false);
    expect(
      LoyaltyCardSchema.safeParse({
        stampsPerCard: STAMPS_PER_CARD,
        earned: 11,
        redeemed: 0,
        available: 1,
        complete: true,
        stamps: Array.from({ length: 11 }, (_, n) => stamp(n)),
      }).success,
    ).toBe(false);
  });

  it('rejects a stamp without a hex colour', () => {
    expect(
      LoyaltyCardSchema.safeParse({
        stampsPerCard: STAMPS_PER_CARD,
        earned: 1,
        redeemed: 0,
        available: 0,
        complete: false,
        stamps: [{ ...stamp(1), colour: 'brown' }],
      }).success,
    ).toBe(false);
  });
});

describe('EarnStampsRequestSchema', () => {
  it('needs an order id and at least one line with a positive quantity', () => {
    expect(
      EarnStampsRequestSchema.safeParse({
        orderId: 'o1',
        lines: [{ itemId: 'milo', name: 'Milo', quantity: 2 }],
      }).success,
    ).toBe(true);
    expect(EarnStampsRequestSchema.safeParse({ orderId: 'o1', lines: [] }).success).toBe(false);
    expect(
      EarnStampsRequestSchema.safeParse({
        orderId: 'o1',
        lines: [{ itemId: 'milo', name: 'Milo', quantity: 0 }],
      }).success,
    ).toBe(false);
  });
});
