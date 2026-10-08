import {
  LoyaltyCardSchema,
  MeResponseSchema,
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
  STAMPS_PER_CARD,
} from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { createUnavailableAccounts } from '../src/accounts/unavailable.js';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';
import { createApp } from '../src/create-app.js';
import { createUnavailableLoyalty } from '../src/loyalty/unavailable.js';
import { PaymentsError, type IntentDetails, type PaymentsProvider } from '../src/payments/types.js';
import { createUnavailablePayments } from '../src/payments/unavailable.js';

const env = { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined };
const catalogue = createSeedCatalogue(loadSeed());

/** Records what was created and serves intents back with a settable status. */
function createFakePayments() {
  const intents = new Map<string, IntentDetails>();
  let counter = 0;
  const provider: PaymentsProvider = {
    async createIntent(amountCents, metadata) {
      const id = `pi_${(counter += 1)}`;
      intents.set(id, {
        id,
        status: 'requires_payment_method',
        amountCents,
        currency: 'aud',
        metadata,
      });
      return { id, clientSecret: `${id}_secret` };
    },
    async getIntent(id) {
      const intent = intents.get(id);
      if (!intent) throw new PaymentsError('not-found', `No payment ${id}`);
      return intent;
    },
  };
  return { provider, intents };
}

const me = MeResponseSchema.parse({
  user: { id: 'u1', email: 't@example.com', createdAt: '2026-01-01T00:00:00.000Z' },
  account: {
    displayName: 'T',
    email: 't@example.com',
    marketingOptIn: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
});
const accountsWithToken = {
  ...createUnavailableAccounts(),
  resolve: async (token: string) => (token === 'good' ? me : null),
};
const loyaltyWithFreeDrink = {
  ...createUnavailableLoyalty(),
  card: async () =>
    LoyaltyCardSchema.parse({
      stampsPerCard: STAMPS_PER_CARD,
      stamps: [],
      earned: STAMPS_PER_CARD,
      redeemed: 0,
      available: 1,
      complete: true,
    }),
};

function buildApp(
  payments: PaymentsProvider,
  overrides: Partial<Parameters<typeof createApp>[1]> = {},
) {
  return createApp(env, {
    catalogue,
    accounts: createUnavailableAccounts(),
    loyalty: createUnavailableLoyalty(),
    payments,
    ...overrides,
  });
}

/** Orange Green Tea with one lot of Boba: 800 + 100 from seed.json. */
const cartLine = {
  itemId: 'orange-green-tea',
  name: 'Orange Green Tea',
  unitPriceCents: 900,
  quantity: 1,
  customisations: [{ name: 'Topping', value: 'Boba' }],
};

const postIntent = (app: ReturnType<typeof createApp>, body: unknown, token?: string) =>
  app.request('/payments/intent', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

describe('POST /payments/intent', () => {
  it('prices the cart from the catalogue and creates a tagged intent', async () => {
    const { provider, intents } = createFakePayments();
    const res = await postIntent(buildApp(provider), {
      lines: [cartLine],
      expectedTotalCents: 900,
    });
    expect(res.status).toBe(200);
    const body = PaymentIntentResponseSchema.parse(await res.json());
    expect(body.amountCents).toBe(900);
    expect(body.currency).toBe('aud');
    expect(intents.get(body.paymentIntentId)?.metadata).toMatchObject({ source: 'bbt' });
  });

  it('refuses a total that disagrees with the server price', async () => {
    const { provider, intents } = createFakePayments();
    const res = await postIntent(buildApp(provider), {
      lines: [cartLine],
      expectedTotalCents: 100,
    });
    expect(res.status).toBe(409);
    expect(intents.size).toBe(0);
  });

  it('answers 422 when the menu no longer has the drink', async () => {
    const { provider } = createFakePayments();
    const res = await postIntent(buildApp(provider), {
      lines: [{ ...cartLine, itemId: 'retired' }],
      expectedTotalCents: 900,
    });
    expect(res.status).toBe(422);
  });

  it('rejects a free drink claim without a token', async () => {
    const { provider } = createFakePayments();
    const res = await postIntent(buildApp(provider), {
      lines: [cartLine],
      expectedTotalCents: 100,
      freeDrink: { lineIndex: 0, cents: 800 },
    });
    expect(res.status).toBe(401);
  });

  it('honours a free drink for a signed in person with one available', async () => {
    const { provider } = createFakePayments();
    const app = buildApp(provider, { accounts: accountsWithToken, loyalty: loyaltyWithFreeDrink });
    const res = await postIntent(
      app,
      { lines: [cartLine], expectedTotalCents: 100, freeDrink: { lineIndex: 0, cents: 800 } },
      'good',
    );
    expect(res.status).toBe(200);
    expect(PaymentIntentResponseSchema.parse(await res.json()).amountCents).toBe(100);
  });

  it('refuses a nothing-to-pay cart', async () => {
    const { provider } = createFakePayments();
    const app = buildApp(provider, { accounts: accountsWithToken, loyalty: loyaltyWithFreeDrink });
    const res = await postIntent(
      app,
      {
        lines: [{ ...cartLine, unitPriceCents: 800, customisations: [] }],
        expectedTotalCents: 800,
        freeDrink: { lineIndex: 0, cents: 800 },
      },
      'good',
    );
    expect(res.status).toBe(422);
  });

  it('answers 503 when the free drink claim meets an unavailable accounts provider', async () => {
    const { provider } = createFakePayments();
    const res = await postIntent(
      buildApp(provider),
      { lines: [cartLine], expectedTotalCents: 100, freeDrink: { lineIndex: 0, cents: 800 } },
      'good',
    );
    expect(res.status).toBe(503);
  });

  it('answers 503 when the loyalty card cannot be read for a free drink claim', async () => {
    const { provider } = createFakePayments();
    const app = buildApp(provider, { accounts: accountsWithToken });
    const res = await postIntent(
      app,
      { lines: [cartLine], expectedTotalCents: 100, freeDrink: { lineIndex: 0, cents: 800 } },
      'good',
    );
    expect(res.status).toBe(503);
  });

  it('answers 503 when payments are not configured', async () => {
    const res = await postIntent(buildApp(createUnavailablePayments()), {
      lines: [cartLine],
      expectedTotalCents: 900,
    });
    expect(res.status).toBe(503);
  });
});

describe('GET /payments/:id', () => {
  it('reads the intent back with status, amount, currency and our tag', async () => {
    const { provider, intents } = createFakePayments();
    const app = buildApp(provider);
    const created = PaymentIntentResponseSchema.parse(
      await (await postIntent(app, { lines: [cartLine], expectedTotalCents: 900 })).json(),
    );
    intents.get(created.paymentIntentId)!.status = 'succeeded';
    const res = await app.request(`/payments/${created.paymentIntentId}`);
    expect(res.status).toBe(200);
    const body = PaymentStatusResponseSchema.parse(await res.json());
    expect(body).toMatchObject({
      status: 'succeeded',
      amountCents: 900,
      currency: 'aud',
      fromKangTea: true,
    });
  });

  it('marks a foreign intent and maps an unknown status onto other', async () => {
    const { provider, intents } = createFakePayments();
    intents.set('pi_foreign', {
      id: 'pi_foreign',
      status: 'requires_capture',
      amountCents: 900,
      currency: 'aud',
      metadata: {},
    });
    const res = await buildApp(provider).request('/payments/pi_foreign');
    const body = PaymentStatusResponseSchema.parse(await res.json());
    expect(body.fromKangTea).toBe(false);
    expect(body.status).toBe('other');
  });

  it('answers 404 for an id the provider does not know', async () => {
    const { provider } = createFakePayments();
    expect((await buildApp(provider).request('/payments/pi_missing')).status).toBe(404);
  });
});
