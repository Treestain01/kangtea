import type { Menu } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { customisationsFixture, menuItemFixture } from '../store/testing';
import { drinkOfTheDay, matchesQuery, popularItems } from './popular';

const menu: Menu = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  customisations: customisationsFixture,
  items: [
    menuItemFixture({ id: 'a', name: 'A' }),
    menuItemFixture({ id: 'b', name: 'B', tags: ['new'] }),
    menuItemFixture({ id: 'c', name: 'C' }),
    menuItemFixture({ id: 'd', name: 'D', tags: ['best-seller'] }),
    menuItemFixture({ id: 'e', name: 'E' }),
    menuItemFixture({ id: 'f', name: 'F' }),
    menuItemFixture({ id: 'g', name: 'G' }),
  ],
};

describe('popularItems', () => {
  it('puts best sellers first, then new, then fills in menu order up to the limit', () => {
    expect(popularItems(menu).map((item) => item.id)).toEqual(['d', 'b', 'a', 'c', 'e', 'f']);
  });

  it('respects a smaller limit', () => {
    expect(popularItems(menu, 2).map((item) => item.id)).toEqual(['d', 'b']);
  });
});

describe('matchesQuery', () => {
  const matcha = menuItemFixture({ name: 'Matcha Latte', description: 'Ceremonial grade' });

  it('matches name and description regardless of case', () => {
    expect(matchesQuery(matcha, 'MATCHA')).toBe(true);
    expect(matchesQuery(matcha, 'ceremonial')).toBe(true);
  });

  it('matches everything on an empty query', () => {
    expect(matchesQuery(matcha, '   ')).toBe(true);
  });

  it('rejects unrelated text', () => {
    expect(matchesQuery(matcha, 'taro')).toBe(false);
  });
});

describe('drinkOfTheDay', () => {
  const item = (id: string, tags: ('best-seller' | 'recommended' | 'new')[]) => ({
    id,
    categoryId: 'c',
    name: id,
    priceCents: 100,
    currency: 'AUD' as const,
    tags,
    colour: '#B07A45',
    pearls: false,
  });
  const menu = {
    categories: [{ id: 'c', name: 'C', sortOrder: 0 }],
    items: [
      item('plain', []),
      item('rec-a', ['recommended']),
      item('best', ['best-seller']),
      item('rec-b', ['recommended']),
    ],
    customisations: { sugarLevels: [], iceLevels: [], toppings: [] },
  };

  it('rotates through the recommended drinks, one per day', () => {
    const a = drinkOfTheDay(menu, new Date('2026-10-01T12:00:00'));
    const b = drinkOfTheDay(menu, new Date('2026-10-02T12:00:00'));
    const c = drinkOfTheDay(menu, new Date('2026-10-03T12:00:00'));
    expect([a?.id, b?.id].sort()).toEqual(['rec-a', 'rec-b']);
    expect(c?.id).toBe(a?.id);
    expect(drinkOfTheDay(menu, new Date('2026-10-01T23:30:00'))?.id).toBe(a?.id);
  });

  it('falls back to best sellers, then anything, then nothing', () => {
    const noRec = { ...menu, items: menu.items.filter((i) => !i.tags.includes('recommended')) };
    expect(drinkOfTheDay(noRec)?.id).toBe('best');
    const plain = { ...menu, items: [item('plain', [])] };
    expect(drinkOfTheDay(plain)?.id).toBe('plain');
    expect(drinkOfTheDay({ ...menu, items: [] })).toBeNull();
  });
});
