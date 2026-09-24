import { MenuSchema, StoreSchema } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp({ ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000 });

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

  it('lists the six Kang Tea categories in display order', async () => {
    const menu = MenuSchema.parse(await (await app.request('/menu')).json());
    const names = [...menu.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => category.name);
    expect(names).toEqual(['Milk Tea', 'Milk Foam', 'Fruit Tea', 'Yakult', 'Milo', 'Matcha']);
  });

  it('has unique item ids', async () => {
    const menu = MenuSchema.parse(await (await app.request('/menu')).json());
    const ids = menu.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
