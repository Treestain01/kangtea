import type { MenuItem, OptionLevel, OrderLine, Topping } from '@bbt/shared';

/** What the customer chose in the customisation dialog. */
export type DrinkSelection = {
  sugar: OptionLevel;
  ice: OptionLevel;
  toppings: Topping[];
  quantity: number;
};

export const SUGAR = 'Sugar';
export const ICE = 'Ice';
export const TOPPING = 'Topping';

/** Unit price for a drink with its toppings, in cents. */
export function unitPriceCents(item: MenuItem, toppings: readonly Topping[]): number {
  return item.priceCents + toppings.reduce((sum, topping) => sum + topping.priceCents, 0);
}

/** Turns a menu item plus a selection into a cart line. Toppings are folded into the unit price. */
export function buildCartLine(item: MenuItem, selection: DrinkSelection): OrderLine {
  return {
    itemId: item.id,
    name: item.name,
    unitPriceCents: unitPriceCents(item, selection.toppings),
    quantity: selection.quantity,
    customisations: [
      { name: SUGAR, value: selection.sugar.name },
      { name: ICE, value: selection.ice.name },
      ...selection.toppings.map((topping) => ({ name: TOPPING, value: topping.name })),
    ],
  };
}

/** Identity of a line in the cart: the drink plus exactly its customisations, in order. */
export function lineKey(line: Pick<OrderLine, 'itemId' | 'customisations'>): string {
  if (line.customisations.length === 0) return line.itemId;
  const choices = line.customisations.map((choice) => `${choice.name}=${choice.value}`).join(';');
  return `${line.itemId}|${choices}`;
}

/** "50% · Less ice · Pearls, Pudding". Empty when the line has no customisations. */
export function summariseCustomisations(line: Pick<OrderLine, 'customisations'>): string {
  const sugar = line.customisations.find((choice) => choice.name === SUGAR)?.value;
  const ice = line.customisations.find((choice) => choice.name === ICE)?.value;
  const toppings = line.customisations
    .filter((choice) => choice.name === TOPPING)
    .map((choice) => choice.value);
  const parts = [sugar, ice, toppings.length > 0 ? toppings.join(', ') : undefined];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
