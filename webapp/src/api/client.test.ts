import { describe, expect, it, vi } from 'vitest';
import { fetchHealth, fetchMenu, fetchStore } from './client';

function fakeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const health = { status: 'ok', service: 'bbt-api', timestamp: '2026-09-23T10:00:00.000Z' };

const open = { open: '11:30', close: '20:00' };
const store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['Shop 29a, Calamvale Central', '662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  timezone: 'Australia/Brisbane',
  hours: { mon: open, tue: open, wed: open, thu: open, fri: open, sat: open, sun: open },
};

const menu = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [
    {
      id: 'signature-milk-tea',
      categoryId: 'milk-tea',
      name: 'Signature Milk Tea',
      priceCents: 750,
      currency: 'AUD',
      tags: [],
      colour: '#B07A45',
      pearls: true,
    },
  ],
};

describe('fetchHealth', () => {
  it('returns the parsed health response', async () => {
    await expect(fetchHealth(fakeFetch(200, health))).resolves.toEqual(health);
  });

  it('calls the /health endpoint on the configured API URL', async () => {
    const impl = fakeFetch(200, health);
    await fetchHealth(impl);
    expect(impl).toHaveBeenCalledWith('http://localhost:3000/health');
  });

  it('throws on a non 2xx status', async () => {
    await expect(fetchHealth(fakeFetch(503, {}))).rejects.toThrow('503');
  });

  it('throws when the body does not match the contract', async () => {
    await expect(fetchHealth(fakeFetch(200, { status: 'down' }))).rejects.toThrow();
  });
});

describe('fetchStore', () => {
  it('returns the parsed store from /store', async () => {
    const impl = fakeFetch(200, store);
    await expect(fetchStore(impl)).resolves.toEqual(store);
    expect(impl).toHaveBeenCalledWith('http://localhost:3000/store');
  });

  it('throws when the store fails the contract', async () => {
    await expect(fetchStore(fakeFetch(200, { ...store, hours: {} }))).rejects.toThrow();
  });
});

describe('fetchMenu', () => {
  it('returns the parsed menu from /menu', async () => {
    const impl = fakeFetch(200, menu);
    await expect(fetchMenu(impl)).resolves.toEqual(menu);
    expect(impl).toHaveBeenCalledWith('http://localhost:3000/menu');
  });

  it('throws when an item references an unknown category', async () => {
    const orphan = { ...menu, items: [{ ...menu.items[0], categoryId: 'coffee' }] };
    await expect(fetchMenu(fakeFetch(200, orphan))).rejects.toThrow();
  });
});
