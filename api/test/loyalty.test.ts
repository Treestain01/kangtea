import { PGlite } from '@electric-sql/pglite';
import { AuthSessionSchema, LoyaltyCardSchema } from '@bbt/shared';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPostgresAccounts } from '../src/accounts/postgres.js';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';
import { createApp } from '../src/create-app.js';
import { migrationsFolder } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { createPostgresLoyalty } from '../src/loyalty/postgres.js';

/** The loyalty routes over the real Postgres providers on PGlite, with a controllable clock. */

const client = new PGlite();
const db = drizzle({ client, schema });
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 8, 27, 1, 0, tick++));
const accounts = createPostgresAccounts(db, clock);
const loyalty = createPostgresLoyalty(db, clock);
const env = { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined };
const app = createApp(env, { catalogue: createSeedCatalogue(loadSeed()), accounts, loyalty });

let token = '';

const request = (path: string, method = 'GET', body?: unknown) =>
  app.request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
  });

const collect = (orderId: string, lines: { itemId: string; name: string; quantity: number }[]) =>
  request('/loyalty/stamps', 'POST', { orderId, lines });

const cardOf = async (res: Response) => LoyaltyCardSchema.parse(await res.json());

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
});

beforeEach(async () => {
  await db.delete(schema.loyaltyRedemptions);
  await db.delete(schema.loyaltyStamps);
  await db.delete(schema.sessions);
  await db.delete(schema.users);
  const res = await app.request('/auth/sign-up', {
    method: 'POST',
    body: JSON.stringify({ email: 't@example.com', password: 'correct horse', displayName: 'T' }),
    headers: { 'content-type': 'application/json' },
  });
  token = AuthSessionSchema.parse(await res.json()).token;
});

afterAll(async () => {
  await client.close();
});

describe('GET /loyalty/card', () => {
  it('starts empty for a new account', async () => {
    const card = await cardOf(await request('/loyalty/card'));
    expect(card).toMatchObject({
      earned: 0,
      redeemed: 0,
      available: 0,
      complete: false,
      stamps: [],
    });
  });

  it('needs a signed in person', async () => {
    token = 'nope';
    expect((await request('/loyalty/card')).status).toBe(401);
  });
});

describe('POST /loyalty/stamps', () => {
  it('earns one stamp per drink, coloured from the menu, oldest first', async () => {
    const res = await collect('order-1', [
      { itemId: 'milo', name: 'Milo', quantity: 2 },
      { itemId: 'matcha-latte', name: 'Matcha Latte', quantity: 1 },
    ]);
    expect(res.status).toBe(200);
    const card = await cardOf(res);
    expect(card.earned).toBe(3);
    expect(card.stamps.map((s) => s.itemName)).toEqual(['Milo', 'Milo', 'Matcha Latte']);
    expect(card.stamps[0]?.colour.toLowerCase()).toBe('#6b4a3a');
  });

  it('never stamps the same order twice', async () => {
    await collect('order-1', [{ itemId: 'milo', name: 'Milo', quantity: 2 }]);
    const again = await cardOf(
      await collect('order-1', [{ itemId: 'milo', name: 'Milo', quantity: 2 }]),
    );
    expect(again.earned).toBe(2);
  });

  it('falls back to the brand navy for a drink no longer on the menu', async () => {
    const card = await cardOf(
      await collect('order-2', [{ itemId: 'gone', name: 'Old Drink', quantity: 1 }]),
    );
    expect(card.stamps[0]?.colour).toBe('#084986');
  });

  it('rejects an empty order', async () => {
    expect((await collect('order-3', [])).status).toBe(400);
  });
});

describe('completing a card and redeeming', () => {
  it('fills the card at ten, keeps showing it until redeemed, then starts fresh', async () => {
    await collect('big', [{ itemId: 'milo', name: 'Milo', quantity: 12 }]);
    let card = await cardOf(await request('/loyalty/card'));
    expect(card).toMatchObject({ earned: 12, available: 1, complete: true });
    expect(card.stamps).toHaveLength(10);

    const redeemed = await request('/loyalty/redeem', 'POST');
    expect(redeemed.status).toBe(200);
    card = await cardOf(redeemed);
    expect(card).toMatchObject({ earned: 12, redeemed: 1, available: 0, complete: false });
    expect(card.stamps).toHaveLength(2);
  });

  it('refuses to redeem with nothing available', async () => {
    await collect('o', [{ itemId: 'milo', name: 'Milo', quantity: 3 }]);
    const res = await request('/loyalty/redeem', 'POST');
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'No free drink to use yet' });
  });

  it('counts two completed cards as two free drinks', async () => {
    await collect('o', [{ itemId: 'milo', name: 'Milo', quantity: 21 }]);
    let card = await cardOf(await request('/loyalty/card'));
    expect(card).toMatchObject({ earned: 21, available: 2, complete: true });
    await request('/loyalty/redeem', 'POST');
    card = await cardOf(await request('/loyalty/card'));
    expect(card).toMatchObject({ available: 1, complete: true });
    expect(card.stamps).toHaveLength(10);
    await request('/loyalty/redeem', 'POST');
    card = await cardOf(await request('/loyalty/card'));
    expect(card).toMatchObject({ available: 0, complete: false });
    expect(card.stamps).toHaveLength(1);
  });
});
