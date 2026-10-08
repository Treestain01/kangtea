import type { FreeDrink, Menu, OrderLine } from '@bbt/shared';

/** The menu has moved under the cart; the route turns this into a 422 so the client refreshes. */
export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

/** Matches `TOPPING` in webapp/src/store/lines.ts; customisations carry topping names, not ids. */
const TOPPING = 'Topping';

/**
 * Prices the cart from the catalogue, ignoring every client-sent price.
 * A claimed free drink takes the drink's menu price off its line, toppings still charged (ADR 0023).
 */
export function priceLines(menu: Menu, lines: readonly OrderLine[], freeDrink?: FreeDrink): number {
  const unitPrice = (line: OrderLine): number => {
    const item = menu.items.find((candidate) => candidate.id === line.itemId);
    if (!item) throw new PricingError(`The menu no longer has ${line.itemId}`);
    const toppings = line.customisations
      .filter((choice) => choice.name === TOPPING)
      .reduce((sum, choice) => {
        const topping = menu.customisations.toppings.find((t) => t.name === choice.value);
        if (!topping) throw new PricingError(`The menu no longer has the topping ${choice.value}`);
        return sum + topping.priceCents * (choice.quantity ?? 1);
      }, 0);
    return item.priceCents + toppings;
  };

  const total = lines.reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0);
  if (!freeDrink) return total;

  const freeLine = lines[freeDrink.lineIndex];
  if (!freeLine) throw new PricingError('The free drink names a line that is not in the cart');
  const base = menu.items.find((candidate) => candidate.id === freeLine.itemId)?.priceCents ?? 0;
  return Math.max(0, total - Math.min(base, unitPrice(freeLine)));
}
