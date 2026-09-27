import { PGlite } from '@electric-sql/pglite';
import { AccountSchema, AuthSessionSchema, MeResponseSchema } from '@bbt/shared';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPostgresAccounts, SESSION_TTL_MS } from '../src/accounts/postgres.js';
import { createUnavailableAccounts } from '../src/accounts/unavailable.js';
import { createUnavailableLoyalty } from '../src/loyalty/unavailable.js';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';
import { createApp } from '../src/create-app.js';
import { migrationsFolder } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';

/** The auth routes over the real Postgres provider, running on PGlite. */

const client = new PGlite();
const db = drizzle({ client, schema });
let clock = new Date('2026-09-27T01:00:00.000Z');
const accounts = createPostgresAccounts(db, () => clock);
const env = { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined };
const app = createApp(env, {
  catalogue: createSeedCatalogue(loadSeed()),
  accounts,
  loyalty: createUnavailableLoyalty(),
});

const credentials = { email: 'tristan@example.com', password: 'correct horse battery' };

function post(path: string, body: unknown, token?: string) {
  return app.request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function signUp(overrides: Record<string, unknown> = {}) {
  const res = await post('/auth/sign-up', { ...credentials, displayName: 'Tristan', ...overrides });
  return { res, session: res.status === 201 ? AuthSessionSchema.parse(await res.json()) : null };
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
});

beforeEach(async () => {
  clock = new Date('2026-09-27T01:00:00.000Z');
  await db.delete(schema.sessions);
  await db.delete(schema.users);
});

afterAll(async () => {
  await client.close();
});

describe('POST /auth/sign-up', () => {
  it('creates the account, opens a session and returns the shared shape', async () => {
    const { res, session } = await signUp();
    expect(res.status).toBe(201);
    expect(session?.user.email).toBe('tristan@example.com');
    expect(session?.account).toMatchObject({
      displayName: 'Tristan',
      email: 'tristan@example.com',
      marketingOptIn: false,
    });
    expect(new Date(session?.expiresAt ?? 0).getTime() - clock.getTime()).toBe(SESSION_TTL_MS);
  });

  it('never stores the password or the token as given', async () => {
    const { session } = await signUp();
    const [user] = await db.select().from(schema.users);
    expect(user?.passwordHash).not.toContain(credentials.password);
    expect(user?.passwordHash.startsWith('scrypt$')).toBe(true);
    const [row] = await db.select().from(schema.sessions);
    expect(row?.tokenHash).not.toBe(session?.token);
  });

  it('normalises the email and refuses a second account for it', async () => {
    await signUp();
    const { res } = await signUp({ email: '  TRISTAN@example.com ' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'That email is already registered' });
  });

  it('rejects a weak password with the field issues', async () => {
    const { res } = await signUp({ password: 'short' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { message: string }[] };
    expect(body.error).toBe('Invalid request');
    expect(body.issues[0]?.message).toBe('Use at least 8 characters');
  });

  it('rejects a body that is not JSON', async () => {
    const res = await app.request('/auth/sign-up', { method: 'POST', body: 'nope' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/sign-in', () => {
  it('opens a new session for the right password', async () => {
    await signUp();
    const res = await post('/auth/sign-in', credentials);
    expect(res.status).toBe(200);
    const session = AuthSessionSchema.parse(await res.json());
    expect(session.user.email).toBe(credentials.email);
    expect(await db.select().from(schema.sessions)).toHaveLength(2);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    await signUp();
    const wrong = await post('/auth/sign-in', { ...credentials, password: 'wrong password!' });
    const unknown = await post('/auth/sign-in', { ...credentials, email: 'nobody@example.com' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });
});

describe('GET and PATCH /auth/me', () => {
  it('resolves the bearer token to the user and account', async () => {
    const { session } = await signUp();
    const res = await app.request('/auth/me', {
      headers: { authorization: `Bearer ${session?.token}` },
    });
    expect(res.status).toBe(200);
    const me = MeResponseSchema.parse(await res.json());
    expect(me.user.id).toBe(session?.user.id);
  });

  it('answers 401 without a token, with an unknown token, and after expiry', async () => {
    const { session } = await signUp();
    expect((await app.request('/auth/me')).status).toBe(401);
    expect(
      (await app.request('/auth/me', { headers: { authorization: 'Bearer nope' } })).status,
    ).toBe(401);
    clock = new Date(clock.getTime() + SESSION_TTL_MS + 1);
    const expired = await app.request('/auth/me', {
      headers: { authorization: `Bearer ${session?.token}` },
    });
    expect(expired.status).toBe(401);
  });

  it('updates the profile fields and keeps email and creation date', async () => {
    const { session } = await signUp();
    const res = await app.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: 'Tris', phone: '0400 000 000', marketingOptIn: true }),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.token}` },
    });
    expect(res.status).toBe(200);
    const account = AccountSchema.parse(await res.json());
    expect(account).toEqual({
      displayName: 'Tris',
      email: credentials.email,
      phone: '0400 000 000',
      marketingOptIn: true,
      createdAt: session?.account.createdAt,
    });
  });

  it('rejects an invalid update', async () => {
    const { session } = await signUp();
    const res = await app.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: '', marketingOptIn: false }),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.token}` },
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/sign-out', () => {
  it('ends the session so the token no longer resolves', async () => {
    const { session } = await signUp();
    const res = await post('/auth/sign-out', {}, session?.token);
    expect(res.status).toBe(204);
    const me = await app.request('/auth/me', {
      headers: { authorization: `Bearer ${session?.token}` },
    });
    expect(me.status).toBe(401);
  });

  it('is fine without a token', async () => {
    expect((await post('/auth/sign-out', {})).status).toBe(204);
  });
});

describe('without a database', () => {
  it('answers 503 rather than crashing', async () => {
    const offline = createApp(env, {
      catalogue: createSeedCatalogue(loadSeed()),
      accounts: createUnavailableAccounts(),
      loyalty: createUnavailableLoyalty(),
    });
    const res = await offline.request('/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify(credentials),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Accounts need a database. Set DATABASE_URL.' });
  });
});

describe('the seed and the accounts tables', () => {
  it('leaves users alone when the catalogue is reseeded', async () => {
    await signUp();
    const { seedDatabase } = await import('../src/db/seed.js');
    await seedDatabase(db, loadSeed());
    const count = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from users`,
    );
    expect(Number(count.rows[0]?.count)).toBe(1);
  });
});
