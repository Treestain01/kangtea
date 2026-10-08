import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createPaymentIntent,
  fetchHealth,
  fetchMe,
  fetchMenu,
  fetchPaymentStatus,
  fetchStore,
  earnStamps,
  fetchLoyaltyCard,
  redeemFreeDrink,
  signIn,
  signOut,
  signUp,
  updateAccount,
} from './client';

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
  customisations: {
    sugarLevels: [{ id: 'sugar-100', name: '100%', isDefault: true }],
    iceLevels: [{ id: 'ice-regular', name: 'Regular ice', isDefault: true }],
    toppings: [{ id: 'pearls', name: 'Pearls', priceCents: 80 }],
  },
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

const user = { id: 'u1', email: 'tristan@example.com', createdAt: '2026-09-27T00:00:00.000Z' };
const account = {
  displayName: 'Tristan',
  email: 'tristan@example.com',
  marketingOptIn: false,
  createdAt: '2026-09-27T00:00:00.000Z',
};
const session = { token: 'opaque', expiresAt: '2026-10-27T00:00:00.000Z', user, account };

function lastCall(impl: typeof fetch): { url: string; init: RequestInit } {
  const [url, init] = vi.mocked(impl).mock.calls[0] as [string, RequestInit];
  return { url, init };
}

describe('fetchHealth', () => {
  it('returns the parsed health response', async () => {
    await expect(fetchHealth(fakeFetch(200, health))).resolves.toEqual(health);
  });

  it('calls the /health endpoint on the configured API URL with GET', async () => {
    const impl = fakeFetch(200, health);
    await fetchHealth(impl);
    const { url, init } = lastCall(impl);
    expect(url).toBe('http://localhost:3000/health');
    expect(init.method).toBe('GET');
  });

  it('throws an ApiError carrying the status on a non 2xx status', async () => {
    const failure = fetchHealth(fakeFetch(503, {}));
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 503 });
    await expect(failure).rejects.toThrow('503');
  });

  it('uses the api error message when there is one', async () => {
    await expect(fetchHealth(fakeFetch(500, { error: 'Internal server error' }))).rejects.toThrow(
      'Internal server error',
    );
  });

  it('throws when the body does not match the contract', async () => {
    await expect(fetchHealth(fakeFetch(200, { status: 'down' }))).rejects.toThrow();
  });
});

describe('fetchStore', () => {
  it('returns the parsed store from /store', async () => {
    const impl = fakeFetch(200, store);
    await expect(fetchStore(impl)).resolves.toEqual(store);
    expect(lastCall(impl).url).toBe('http://localhost:3000/store');
  });

  it('throws when the store fails the contract', async () => {
    await expect(fetchStore(fakeFetch(200, { ...store, hours: {} }))).rejects.toThrow();
  });
});

describe('fetchMenu', () => {
  it('returns the parsed menu from /menu', async () => {
    const impl = fakeFetch(200, menu);
    await expect(fetchMenu(impl)).resolves.toEqual(menu);
    expect(lastCall(impl).url).toBe('http://localhost:3000/menu');
  });

  it('throws when an item references an unknown category', async () => {
    const orphan = { ...menu, items: [{ ...menu.items[0], categoryId: 'coffee' }] };
    await expect(fetchMenu(fakeFetch(200, orphan))).rejects.toThrow();
  });
});

describe('auth calls', () => {
  it('signUp posts JSON to /auth/sign-up and returns the session', async () => {
    const impl = fakeFetch(201, session);
    const input = { email: 'tristan@example.com', password: 'correct horse', displayName: 'T' };
    await expect(signUp(input, impl)).resolves.toEqual(session);
    const { url, init } = lastCall(impl);
    expect(url).toBe('http://localhost:3000/auth/sign-up');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it('signIn surfaces the 401 message as an ApiError', async () => {
    const failure = signIn(
      { email: 'tristan@example.com', password: 'wrong horse!' },
      fakeFetch(401, { error: 'Email or password is incorrect' }),
    );
    await expect(failure).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect',
    });
  });

  it('fetchMe sends the bearer token', async () => {
    const impl = fakeFetch(200, { user, account });
    await expect(fetchMe('opaque', impl)).resolves.toEqual({ user, account });
    expect(lastCall(impl).init.headers).toMatchObject({ authorization: 'Bearer opaque' });
  });

  it('updateAccount patches /auth/me with the token and returns the account', async () => {
    const impl = fakeFetch(200, { ...account, displayName: 'Tris' });
    const update = { displayName: 'Tris', marketingOptIn: false };
    await expect(updateAccount('opaque', update, impl)).resolves.toMatchObject({
      displayName: 'Tris',
    });
    const { url, init } = lastCall(impl);
    expect(url).toBe('http://localhost:3000/auth/me');
    expect(init.method).toBe('PATCH');
    expect(init.headers).toMatchObject({ authorization: 'Bearer opaque' });
  });

  it('signOut posts the token and resolves on 204', async () => {
    const impl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no body');
      },
    }) as unknown as typeof fetch;
    await expect(signOut('opaque', impl)).resolves.toBeUndefined();
    expect(lastCall(impl).init.headers).toMatchObject({ authorization: 'Bearer opaque' });
  });
});

describe('loyalty calls', () => {
  const card = {
    stampsPerCard: 10,
    earned: 2,
    redeemed: 0,
    available: 0,
    complete: false,
    stamps: [
      { id: 's1', itemName: 'Milo', colour: '#6B4A3A', earnedAt: '2026-09-27T01:00:00.000Z' },
      { id: 's2', itemName: 'Milo', colour: '#6B4A3A', earnedAt: '2026-09-27T01:00:01.000Z' },
    ],
  };

  it('fetchLoyaltyCard reads /loyalty/card with the token', async () => {
    const impl = fakeFetch(200, card);
    await expect(fetchLoyaltyCard('opaque', impl)).resolves.toEqual(card);
    const { url, init } = lastCall(impl);
    expect(url).toBe('http://localhost:3000/loyalty/card');
    expect(init.headers).toMatchObject({ authorization: 'Bearer opaque' });
  });

  it('earnStamps posts the collected order', async () => {
    const impl = fakeFetch(200, card);
    const request = { orderId: 'o1', lines: [{ itemId: 'milo', name: 'Milo', quantity: 2 }] };
    await expect(earnStamps('opaque', request, impl)).resolves.toEqual(card);
    const { url, init } = lastCall(impl);
    expect(url).toBe('http://localhost:3000/loyalty/stamps');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it('redeemFreeDrink posts to /loyalty/redeem and surfaces a 409 message', async () => {
    const impl = fakeFetch(200, card);
    await expect(redeemFreeDrink('opaque', impl)).resolves.toEqual(card);
    expect(lastCall(impl).url).toBe('http://localhost:3000/loyalty/redeem');
    await expect(
      redeemFreeDrink('opaque', fakeFetch(409, { error: 'No free drink to use yet' })),
    ).rejects.toMatchObject({ status: 409, message: 'No free drink to use yet' });
  });

  it('rejects a card that breaks the contract', async () => {
    await expect(
      fetchLoyaltyCard('opaque', fakeFetch(200, { ...card, complete: true })),
    ).rejects.toThrow();
  });
});

const paymentLine = {
  itemId: 'signature-milk-tea',
  name: 'Signature Milk Tea',
  unitPriceCents: 900,
  quantity: 1,
  customisations: [],
};

const intentResponse = {
  paymentIntentId: 'pi_1',
  clientSecret: 'pi_1_secret',
  amountCents: 900,
  currency: 'aud',
};

describe('createPaymentIntent', () => {
  it('posts the cart with the bearer token and parses the response', async () => {
    const impl = fakeFetch(200, intentResponse);
    const request = { lines: [paymentLine], expectedTotalCents: 900 };
    await expect(createPaymentIntent(request, 'tok', impl)).resolves.toEqual(intentResponse);
    const { url, init } = lastCall(impl);
    expect(url).toBe('http://localhost:3000/payments/intent');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('throws the api error on a 409', async () => {
    const failing = createPaymentIntent(
      { lines: [paymentLine], expectedTotalCents: 1 },
      undefined,
      fakeFetch(409, { error: 'The menu has changed; refresh and try again' }),
    );
    await expect(failing).rejects.toThrow('The menu has changed');
  });
});

describe('fetchPaymentStatus', () => {
  it('reads a verified status back', async () => {
    const status = {
      paymentIntentId: 'pi_1',
      status: 'succeeded',
      amountCents: 900,
      currency: 'aud',
      fromKangTea: true,
    };
    await expect(fetchPaymentStatus('pi_1', fakeFetch(200, status))).resolves.toEqual(status);
  });
});
