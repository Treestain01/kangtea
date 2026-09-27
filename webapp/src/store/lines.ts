import type { Customisation, MenuItem, OptionLevel, OrderLine, Topping } from '@bbt/shared';

/** A topping and how many lots of it. */
export type ToppingChoice = {
  topping: Topping;
  quantity: number;
};

/** What the customer chose in the customisation dialog. */
export type DrinkSelection = {
  sugar: OptionLevel;
  ice: OptionLevel;
  toppings: ToppingChoice[];
  quantity: number;
};

export const SUGAR = 'Sugar';
export const ICE = 'Ice';
export const TOPPING = 'Topping';

/**
 * How many lots of one topping a drink can take. A placeholder until Kang Tea says otherwise;
 * the dialog stops the "+" at this number.
 */
export const MAX_TOPPING_QUANTITY = 3;

/** Unit price for a drink with its toppings, in cents. Each lot of a topping is charged. */
export function unitPriceCents(item: MenuItem, toppings: readonly ToppingChoice[]): number {
  return (
    item.priceCents +
    toppings.reduce((sum, choice) => sum + choice.topping.priceCents * choice.quantity, 0)
  );
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
      ...selection.toppings.map((choice): Customisation =>
        choice.quantity > 1
          ? { name: TOPPING, value: choice.topping.name, quantity: choice.quantity }
          : { name: TOPPING, value: choice.topping.name },
      ),
    ],
  };
}

/** "Pearls" for one lot, "Pearls ×2" for more. */
export function describeCustomisation(choice: Customisation): string {
  return choice.quantity && choice.quantity > 1
    ? `${choice.value} ×${choice.quantity}`
    : choice.value;
}

/** Identity of a line in the cart: the drink plus exactly its customisations and their quantities, in order. */
export function lineKey(line: Pick<OrderLine, 'itemId' | 'customisations'>): string {
  if (line.customisations.length === 0) return line.itemId;
  const choices = line.customisations
    .map((choice) => `${choice.name}=${describeCustomisation(choice)}`)
    .join(';');
  return `${line.itemId}|${choices}`;
}

/** "50% · Less ice · Pearls ×2, Pudding". Empty when the line has no customisations. */
export function summariseCustomisations(line: Pick<OrderLine, 'customisations'>): string {
  const sugar = line.customisations.find((choice) => choice.name === SUGAR)?.value;
  const ice = line.customisations.find((choice) => choice.name === ICE)?.value;
  const toppings = line.customisations
    .filter((choice) => choice.name === TOPPING)
    .map(describeCustomisation);
  const parts = [sugar, ice, toppings.length > 0 ? toppings.join(', ') : undefined];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
