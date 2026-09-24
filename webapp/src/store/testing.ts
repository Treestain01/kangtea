import type { Menu, MenuItem } from '@bbt/shared';
import { createLocalStores } from './local';
import type { CartLine, Stores } from './types';

/** An in memory Storage for tests. Same contract as window.localStorage. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

/** Fresh stores over an in memory storage. */
export function createTestStores(): Stores {
  return createLocalStores(createMemoryStorage());
}

/** A menu item fixture. Colour is product data, not a UI token. */
export function menuItemFixture(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'signature-milk-tea',
    categoryId: 'milk-tea',
    name: 'Signature Milk Tea',
    priceCents: 750,
    currency: 'AUD',
    tags: [],
    colour: '#B07A45',
    pearls: true,
    ...overrides,
  };
}

/** A plain cart line for the fixture drink, one of it, no customisations. */
export function cartLineFixture(overrides: Partial<CartLine> = {}): CartLine {
  return {
    itemId: 'signature-milk-tea',
    name: 'Signature Milk Tea',
    unitPriceCents: 750,
    quantity: 1,
    customisations: [],
    ...overrides,
  };
}

/** The customisation choices every test menu offers. */
export const customisationsFixture: Menu['customisations'] = {
  sugarLevels: [
    { id: 'sugar-50', name: '50%', isDefault: false },
    { id: 'sugar-100', name: '100%', isDefault: true },
  ],
  iceLevels: [
    { id: 'ice-less', name: 'Less ice', isDefault: false },
    { id: 'ice-regular', name: 'Regular ice', isDefault: true },
  ],
  toppings: [
    { id: 'pearls', name: 'Pearls', priceCents: 80 },
    { id: 'pudding', name: 'Pudding', priceCents: 100 },
  ],
};
