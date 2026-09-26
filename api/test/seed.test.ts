import { describe, expect, it } from 'vitest';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';

describe('seed.json', () => {
  it('parses against the shared contract', () => {
    expect(() => loadSeed()).not.toThrow();
  });

  it('holds the Calamvale Central store and the six categories', () => {
    const seed = loadSeed();
    expect(seed.store.id).toBe('calamvale-central');
    expect(seed.menu.categories.map((category) => category.name)).toEqual([
      'Milk Tea',
      'Milk Foam',
      'Fruit Tea',
      'Yakult',
      'Milo',
      'Matcha',
    ]);
  });

  it('uses unique ids within every list', () => {
    const { menu } = loadSeed();
    for (const list of [
      menu.categories,
      menu.items,
      menu.customisations.sugarLevels,
      menu.customisations.iceLevels,
      menu.customisations.toppings,
    ]) {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('createSeedCatalogue', () => {
  it('serves the seed as is', async () => {
    const seed = loadSeed();
    const catalogue = createSeedCatalogue(seed);
    await expect(catalogue.getStore()).resolves.toEqual(seed.store);
    await expect(catalogue.getMenu()).resolves.toEqual(seed.menu);
  });
});
