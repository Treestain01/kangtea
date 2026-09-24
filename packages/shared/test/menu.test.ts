import { describe, expect, it } from 'vitest';
import { MenuItemSchema, MenuSchema } from '../src/index';

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
});

describe('MenuSchema', () => {
  it('accepts items that reference listed categories', () => {
    expect(MenuSchema.safeParse({ categories: [milkTea], items: [signature] }).success).toBe(true);
  });

  it('rejects an item whose category is not listed', () => {
    const orphan = { ...signature, categoryId: 'coffee' };
    const result = MenuSchema.safeParse({ categories: [milkTea], items: [orphan] });
    expect(result.success).toBe(false);
  });

  it('requires at least one category', () => {
    expect(MenuSchema.safeParse({ categories: [], items: [] }).success).toBe(false);
  });
});
