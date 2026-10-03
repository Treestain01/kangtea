import { describe, expect, it } from 'vitest';
import {
  MenuCustomisationsSchema,
  MenuItemSchema,
  MenuItemTagSchema,
  MenuSchema,
} from '../src/index.js';

const milkTea = { id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 };

const signature = {
  id: 'signature-milk-tea',
  categoryId: 'milk-tea',
  name: 'Signature Milk Tea',
  priceCents: 750,
  currency: 'AUD',
  tags: ['best-seller'],
  colour: '#B07A45',
  pearls: true,
};

const customisations = {
  sugarLevels: [
    { id: 'sugar-50', name: '50%', isDefault: false },
    { id: 'sugar-100', name: '100%', isDefault: true },
  ],
  iceLevels: [
    { id: 'ice-less', name: 'Less ice', isDefault: false },
    { id: 'ice-regular', name: 'Regular ice', isDefault: true },
  ],
  toppings: [{ id: 'pearls', name: 'Pearls', priceCents: 80 }],
};

describe('MenuItemTagSchema', () => {
  it('knows best-seller, recommended and new', () => {
    for (const tag of ['best-seller', 'recommended', 'new']) {
      expect(MenuItemTagSchema.safeParse(tag).success).toBe(true);
    }
    expect(MenuItemTagSchema.safeParse('featured').success).toBe(false);
  });
});

describe('MenuItemSchema', () => {
  it('accepts a complete item', () => {
    expect(MenuItemSchema.safeParse(signature).success).toBe(true);
  });

  it('rejects fractional cents', () => {
    expect(MenuItemSchema.safeParse({ ...signature, priceCents: 7.5 }).success).toBe(false);
  });

  it('rejects currencies other than AUD', () => {
    expect(MenuItemSchema.safeParse({ ...signature, currency: 'USD' }).success).toBe(false);
  });

  it('rejects unknown tags', () => {
    expect(MenuItemSchema.safeParse({ ...signature, tags: ['spicy'] }).success).toBe(false);
  });

  it('rejects a non hex colour', () => {
    expect(MenuItemSchema.safeParse({ ...signature, colour: 'brown' }).success).toBe(false);
  });

  it('accepts an orange or lemon garnish, or none at all', () => {
    expect(MenuItemSchema.safeParse({ ...signature, garnish: 'orange' }).success).toBe(true);
    expect(MenuItemSchema.safeParse({ ...signature, garnish: 'lemon' }).success).toBe(true);
    expect(MenuItemSchema.safeParse(signature).success).toBe(true);
  });

  it('rejects an unknown garnish', () => {
    expect(MenuItemSchema.safeParse({ ...signature, garnish: 'apple' }).success).toBe(false);
  });
});

describe('MenuCustomisationsSchema', () => {
  it('accepts levels with exactly one default and priced toppings', () => {
    expect(MenuCustomisationsSchema.safeParse(customisations).success).toBe(true);
  });

  it('rejects a level list with no default', () => {
    const noDefault = {
      ...customisations,
      sugarLevels: customisations.sugarLevels.map((level) => ({ ...level, isDefault: false })),
    };
    expect(MenuCustomisationsSchema.safeParse(noDefault).success).toBe(false);
  });

  it('rejects a level list with two defaults', () => {
    const twoDefaults = {
      ...customisations,
      iceLevels: customisations.iceLevels.map((level) => ({ ...level, isDefault: true })),
    };
    expect(MenuCustomisationsSchema.safeParse(twoDefaults).success).toBe(false);
  });

  it('allows no toppings', () => {
    expect(MenuCustomisationsSchema.safeParse({ ...customisations, toppings: [] }).success).toBe(
      true,
    );
  });
});

describe('MenuSchema', () => {
  it('accepts items that reference listed categories', () => {
    const menu = { categories: [milkTea], items: [signature], customisations };
    expect(MenuSchema.safeParse(menu).success).toBe(true);
  });

  it('rejects an item whose category is not listed', () => {
    const orphan = { ...signature, categoryId: 'coffee' };
    const menu = { categories: [milkTea], items: [orphan], customisations };
    expect(MenuSchema.safeParse(menu).success).toBe(false);
  });

  it('requires at least one category', () => {
    expect(MenuSchema.safeParse({ categories: [], items: [], customisations }).success).toBe(false);
  });

  it('requires the customisations block', () => {
    expect(MenuSchema.safeParse({ categories: [milkTea], items: [signature] }).success).toBe(false);
  });
});
