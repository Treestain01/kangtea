import { describe, expect, it } from 'vitest';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';

describe('seed.json', () => {
  it('parses against the shared contract', () => {
    expect(() => loadSeed()).not.toThrow();
  });

  it('holds the Calamvale Central store and the four series from the board', () => {
    const seed = loadSeed();
    expect(seed.store.id).toBe('calamvale-central');
    expect(seed.menu.categories.map((category) => category.name)).toEqual([
      'Fruit Tea',
      'Yakult',
      'Milo',
      'Matcha',
    ]);
  });

  it('garnishes every drink named after a citrus with that citrus', () => {
    // The board rule: a drink with orange or lemon in its name comes with those slices.
    const { menu } = loadSeed();
    for (const item of menu.items) {
      const name = item.name.toLowerCase();
      if (name.includes('orange')) expect(item, item.name).toMatchObject({ garnish: 'orange' });
      else if (name.includes('lemon')) expect(item, item.name).toMatchObject({ garnish: 'lemon' });
    }
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
