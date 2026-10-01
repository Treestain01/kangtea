import type { Order, OrderLine } from '@bbt/shared';

/** The most common value of one kind of choice, and how many of the drinks had it. */
export type Habit = { value: string; count: number };

export type Taste = {
  /** Collected orders the portrait is drawn from. */
  orders: number;
  /** Drinks across those orders, counting quantity. */
  drinks: number;
  /** The drink ordered most, by quantity. */
  favourite: { itemId: string; name: string; count: number };
  sugar: Habit | null;
  ice: Habit | null;
  topping: Habit | null;
};

function tally(entries: Iterable<[string, number]>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key, n] of entries) counts.set(key, (counts.get(key) ?? 0) + n);
  return counts;
}

function top(counts: Map<string, number>): Habit | null {
  let best: Habit | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

function choices(line: OrderLine, kind: string): string[] {
  return line.customisations.filter((choice) => choice.name === kind).map((choice) => choice.value);
}

/**
 * Reads a person's taste off their collected orders: the drink they order most and the sugar, ice
 * and topping they pick most often, each weighted by how many drinks it was on. Null with no history.
 */
export function tasteFrom(orders: readonly Order[]): Taste | null {
  const lines = orders
    .filter((order) => order.status === 'collected')
    .flatMap((order) => order.lines);
  if (lines.length === 0) return null;

  const drinks = lines.reduce((sum, line) => sum + line.quantity, 0);
  const byItem = new Map<string, { name: string; count: number }>();
  for (const line of lines) {
    const current = byItem.get(line.itemId);
    byItem.set(line.itemId, { name: line.name, count: (current?.count ?? 0) + line.quantity });
  }
  const [favouriteId, favourite] = [...byItem.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  )[0] as [string, { name: string; count: number }];

  const habit = (kind: string) =>
    top(
      tally(
        lines.flatMap((line) =>
          // One topping line may carry several toppings; each counts once per drink.
          [...new Set(choices(line, kind))].map((value): [string, number] => [
            value,
            line.quantity,
          ]),
        ),
      ),
    );

  return {
    orders: orders.filter((order) => order.status === 'collected').length,
    drinks,
    favourite: { itemId: favouriteId, name: favourite.name, count: favourite.count },
    sugar: habit('Sugar'),
    ice: habit('Ice'),
    topping: habit('Topping'),
  };
}
