import type { Menu } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { customisationsFixture, menuItemFixture } from '../store/testing';
import { matchesQuery, popularItems } from './popular';

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
