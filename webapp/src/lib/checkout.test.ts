import type { Menu } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import type { LoyaltyState } from '../loyalty/LoyaltyProvider';
import { cartLineFixture, customisationsFixture, menuItemFixture } from '../store/testing';
import { freeDrinkFor } from './checkout';

const item = menuItemFixture({ id: 'milk-tea', priceCents: 700 });
const menu: Menu = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [item],
  customisations: customisationsFixture,
};
const line = cartLineFixture({ itemId: 'milk-tea', unitPriceCents: 800 });
const readyCard = (available: number): LoyaltyState => ({
  kind: 'ready',
  card: {
    stampsPerCard: 10,
    stamps: [],
    earned: 10,
    redeemed: 1 - available,
    available,
    complete: available > 0,
  },
});

describe('freeDrinkFor', () => {
  it('is the first line at its base menu price when a redemption is available', () => {
    expect(freeDrinkFor([line], menu, readyCard(1))).toEqual({ lineIndex: 0, cents: 700 });
  });

  it('is nothing without an available redemption, a cart, or a loyalty card', () => {
    expect(freeDrinkFor([line], menu, readyCard(0))).toBeUndefined();
    expect(freeDrinkFor([], menu, readyCard(1))).toBeUndefined();
    expect(freeDrinkFor([line], menu, { kind: 'signed-out' })).toBeUndefined();
  });

  it('never exceeds the line price when the menu price is higher', () => {
    const cheap = cartLineFixture({ itemId: 'milk-tea', unitPriceCents: 500 });
    expect(freeDrinkFor([cheap], menu, readyCard(1))).toEqual({ lineIndex: 0, cents: 500 });
  });

  it('is nothing for a drink the menu no longer has', () => {
    expect(
      freeDrinkFor([cartLineFixture({ itemId: 'retired' })], menu, readyCard(1)),
    ).toBeUndefined();
  });
});
