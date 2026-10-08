import type { FreeDrink, Menu, OrderLine } from '@bbt/shared';
import type { LoyaltyState } from '../loyalty/LoyaltyProvider';

/**
 * The loyalty free drink this cart can claim: the first drink at its menu price without toppings,
 * capped at the line price (ADR 0023). One definition for the order panel and the pay page.
 */
export function freeDrinkFor(
  cart: readonly OrderLine[],
  menu: Menu | undefined,
  loyalty: LoyaltyState,
): FreeDrink | undefined {
  if (loyalty.kind !== 'ready' || loyalty.card.available < 1) return undefined;
  const first = cart[0];
  if (!first || !menu) return undefined;
  const base = menu.items.find((item) => item.id === first.itemId)?.priceCents;
  if (base === undefined) return undefined;
  return { lineIndex: 0, cents: Math.min(first.unitPriceCents, base) };
}
