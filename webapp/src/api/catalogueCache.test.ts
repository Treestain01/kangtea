import { describe, expect, it } from 'vitest';
import { createMemoryStorage, customisationsFixture, menuItemFixture } from '../store/testing';
import { CATALOGUE_CACHE_KEY, readCachedCatalogue, writeCachedCatalogue } from './catalogueCache';

const hours = { open: '11:30', close: '20:00' };
const loaded = {
  store: {
    id: 'calamvale-central',
    name: 'Kang Tea Calamvale Central',
    shortName: 'Calamvale Central',
    addressLines: ['662 Compton Road'],
    suburb: 'Calamvale',
    state: 'QLD',
    postcode: '4116',
    timezone: 'Australia/Brisbane',
    hours: { mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: hours, sun: hours },
  },
  menu: {
    categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
    items: [menuItemFixture()],
    customisations: customisationsFixture,
  },
};

describe('catalogue cache', () => {
  it('is empty until written, then reads back what was written', () => {
    const storage = createMemoryStorage();
    expect(readCachedCatalogue(storage)).toBeNull();
    writeCachedCatalogue(storage, loaded);
    expect(readCachedCatalogue(storage)).toEqual(loaded);
    expect(storage.getItem(CATALOGUE_CACHE_KEY)).not.toBeNull();
  });

  it('drops a cached value that no longer matches the contract', () => {
    const storage = createMemoryStorage();
    storage.setItem(CATALOGUE_CACHE_KEY, JSON.stringify({ store: loaded.store }));
    expect(readCachedCatalogue(storage)).toBeNull();
    expect(storage.getItem(CATALOGUE_CACHE_KEY)).toBeNull();
  });

  it('ignores something that is not JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(CATALOGUE_CACHE_KEY, '{not json');
    expect(readCachedCatalogue(storage)).toBeNull();
  });

  it('does nothing without a storage', () => {
    expect(readCachedCatalogue(null)).toBeNull();
    expect(() => writeCachedCatalogue(null, loaded)).not.toThrow();
  });
});
