import { MenuSchema, StoreSchema } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/create-app.js';
import { createUnavailableAccounts } from '../src/accounts/unavailable.js';
import { createUnavailableLoyalty } from '../src/loyalty/unavailable.js';
import { createUnavailablePayments } from '../src/payments/unavailable.js';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';

const app = createApp(
  { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined },
  {
    catalogue: createSeedCatalogue(loadSeed()),
    accounts: createUnavailableAccounts(),
    loyalty: createUnavailableLoyalty(),
    payments: createUnavailablePayments(),
  },
);

describe('GET /store', () => {
  it('returns the Calamvale Central store matching the shared contract', async () => {
    const res = await app.request('/store');
    expect(res.status).toBe(200);
    const parsed = StoreSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe('calamvale-central');
      expect(parsed.data.timezone).toBe('Australia/Brisbane');
    }
  });
});

describe('GET /menu', () => {
  it('returns a menu matching the shared contract', async () => {
    const res = await app.request('/menu');
    expect(res.status).toBe(200);
    const parsed = MenuSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
  });

  it('lists the four Kang Tea series in display order', async () => {
    const menu = MenuSchema.parse(await (await app.request('/menu')).json());
    const names = [...menu.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => category.name);
    expect(names).toEqual(['Fruit Tea', 'Yakult', 'Milo', 'Matcha']);
  });

  it('offers sugar and ice levels with one default each, and priced toppings', async () => {
    const menu = MenuSchema.parse(await (await app.request('/menu')).json());
    expect(menu.customisations.sugarLevels.filter((level) => level.isDefault)).toHaveLength(1);
    expect(menu.customisations.iceLevels.filter((level) => level.isDefault)).toHaveLength(1);
    expect(menu.customisations.toppings.length).toBeGreaterThan(0);
    expect(menu.customisations.toppings.every((topping) => topping.priceCents > 0)).toBe(true);
  });

  it('has unique item ids', async () => {
    const menu = MenuSchema.parse(await (await app.request('/menu')).json());
    const ids = menu.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('when the catalogue fails', () => {
  it('answers 500 with the standard error shape and no internals', async () => {
    const failing = createApp(
      { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined },
      {
        catalogue: {
          getStore: () => Promise.reject(new Error('connection refused')),
          getMenu: () => Promise.reject(new Error('connection refused')),
        },
        accounts: createUnavailableAccounts(),
        loyalty: createUnavailableLoyalty(),
        payments: createUnavailablePayments(),
      },
    );
    const res = await failing.request('/menu');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
