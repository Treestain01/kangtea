import type { MenuItem } from '@bbt/shared';
import { createLocalStores } from './local';
import type { Stores } from './types';

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
