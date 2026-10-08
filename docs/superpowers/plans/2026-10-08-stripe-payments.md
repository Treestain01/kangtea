# Stripe Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Place order" leads to a `/pay` page where Stripe's Payment Element takes payment; the api prices the cart, creates the PaymentIntent, and verifies it against Stripe before the webapp places the order.

**Architecture:** A new `payment.ts` contract in `packages/shared`; a `PaymentsProvider` seam in the api (Stripe implementation, unavailable fallback, fake in tests) behind two routes that price server-side and verify server-side; a `/pay` page in the webapp that rebuilds the intent from the cart, confirms with Stripe.js, and only places the order on a server-verified success with matching amount, currency and metadata.

**Tech Stack:** Hono, Zod, `stripe` (api), `@stripe/stripe-js` + `@stripe/react-stripe-js` (webapp), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-stripe-payments-design.md`

## Global Constraints

- Currency is pinned to `aud`; money is integer cents everywhere; `lib/money.ts` formats at render.
- Only `api/src/env.ts` reads `process.env`; only `webapp/src/config.ts` reads `import.meta.env`.
- Every api response is parsed against its shared schema before sending; every webapp response is parsed on receipt.
- api relative imports end in `.js`; routes read data only through providers, never SDKs or the database.
- Webapp colours only via `var(--color-*)` from `src/theme/tokens.css`; breakpoints only 768px and 1024px; motion via `--motion-*`/`--ease` tokens; tap targets at least 44px (`tokens.test.ts` and the responsive-ui skill enforce these).
- Test first: write the failing test, watch it fail, implement, watch it pass, commit.
- Markdown prose: one sentence per line; never use an em dash.
- Commit messages: imperative, no agent co-author line.
- `pnpm check` from the repo root must be green before the work is declared done.

## Review Focus

Spec-implied failure modes most likely to bite, each pinned to a test in the owning task:

1. The cart changes in another tab while `/pay` is open, then the old intent succeeds: the order must not be placed at the stale amount. Pinned in Task 9 ("refuses a verified payment whose amount no longer matches the cart").
2. The api dies between Stripe charging the card and verification: the cart must survive and the page must show a retryable error, never place unverified. Pinned in Task 9 ("keeps the cart and shows an error when verification fails").
3. A free drink is claimed without a session token (signed out mid-flow): the intent request must 401, not silently price at full. Pinned in Task 5 ("rejects a free drink claim without a token").
4. A zero or negative payable total reaches the intent route (the webapp should have placed directly): 422, nothing created at Stripe. Pinned in Task 5 ("refuses a nothing-to-pay cart").
5. A foreign or swapped PaymentIntent id is presented at verification: `fromKangTea` false and amount mismatch must both independently block placement. Pinned in Task 5 (metadata tag in the response) and Task 9 ("refuses a payment that is not ours").

---

### Task 1: Payment contract in packages/shared

**Files:**
- Create: `packages/shared/src/payment.ts`
- Modify: `packages/shared/src/order.ts` (add `paymentIntentId` to `OrderSchema`)
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/test/payment.test.ts`
- Modify: `packages/shared/test/order.test.ts`

**Interfaces:**
- Consumes: `OrderLineSchema`, `FreeDrinkSchema` from `order.ts`.
- Produces: `PAYMENT_CURRENCY = 'aud'`, `PaymentIntentRequestSchema`/`PaymentIntentRequest`, `PaymentIntentResponseSchema`/`PaymentIntentResponse`, `PaymentStatusSchema`/`PaymentStatus`, `PaymentStatusResponseSchema`/`PaymentStatusResponse`, and `Order.paymentIntentId?: string`.

- [ ] **Step 1: Write the failing tests**

`packages/shared/test/payment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PAYMENT_CURRENCY,
  PaymentIntentRequestSchema,
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
} from '../src/index.js';

const line = {
  itemId: 'orange-green-tea',
  name: 'Orange Green Tea',
  unitPriceCents: 800,
  quantity: 1,
  customisations: [],
};

describe('PaymentIntentRequestSchema', () => {
  it('accepts lines with an expected total and an optional free drink', () => {
    expect(
      PaymentIntentRequestSchema.safeParse({ lines: [line], expectedTotalCents: 800 }).success,
    ).toBe(true);
    expect(
      PaymentIntentRequestSchema.safeParse({
        lines: [line],
        expectedTotalCents: 100,
        freeDrink: { lineIndex: 0, cents: 700 },
      }).success,
    ).toBe(true);
  });

  it('rejects an empty cart and a non positive total', () => {
    expect(PaymentIntentRequestSchema.safeParse({ lines: [], expectedTotalCents: 800 }).success).toBe(false);
    expect(PaymentIntentRequestSchema.safeParse({ lines: [line], expectedTotalCents: 0 }).success).toBe(false);
  });
});

describe('PaymentIntentResponseSchema', () => {
  it('accepts an aud intent and rejects any other currency', () => {
    const response = {
      paymentIntentId: 'pi_1',
      clientSecret: 'pi_1_secret_x',
      amountCents: 800,
      currency: PAYMENT_CURRENCY,
    };
    expect(PaymentIntentResponseSchema.safeParse(response).success).toBe(true);
    expect(PaymentIntentResponseSchema.safeParse({ ...response, currency: 'usd' }).success).toBe(false);
  });
});

describe('PaymentStatusResponseSchema', () => {
  it('accepts a verified status and rejects an unknown status word', () => {
    const response = {
      paymentIntentId: 'pi_1',
      status: 'succeeded',
      amountCents: 800,
      currency: 'aud',
      fromKangTea: true,
    };
    expect(PaymentStatusResponseSchema.safeParse(response).success).toBe(true);
    expect(PaymentStatusResponseSchema.safeParse({ ...response, status: 'paid' }).success).toBe(false);
  });
});
```

Add to `packages/shared/test/order.test.ts`, inside the existing `OrderSchema` describe (reuse that file's valid order fixture, here called `order`):

```ts
it('carries an optional payment intent id', () => {
  expect(OrderSchema.safeParse({ ...order, paymentIntentId: 'pi_1' }).success).toBe(true);
  expect(OrderSchema.safeParse(order).success).toBe(true);
  expect(OrderSchema.safeParse({ ...order, paymentIntentId: '' }).success).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @bbt/shared test`
Expected: FAIL, `payment.test.ts` cannot resolve the new exports.

- [ ] **Step 3: Implement the contract**

Create `packages/shared/src/payment.ts`:

```ts
import { z } from 'zod';
import { FreeDrinkSchema, OrderLineSchema } from './order.js';

/** Kang Tea charges in Australian dollars only; Stripe wants the lowercase ISO code. */
export const PAYMENT_CURRENCY = 'aud';

/**
 * What the webapp sends to open a payment: the cart as it stands and the total it showed.
 * The api prices the lines itself from the catalogue and refuses when the totals disagree,
 * so the client never dictates an amount.
 */
export const PaymentIntentRequestSchema = z.object({
  lines: z.array(OrderLineSchema).min(1),
  expectedTotalCents: z.number().int().positive(),
  /** Claiming the loyalty free drink; the api checks the card before honouring it. */
  freeDrink: FreeDrinkSchema.optional(),
});
export type PaymentIntentRequest = z.infer<typeof PaymentIntentRequestSchema>;

export const PaymentIntentResponseSchema = z.object({
  paymentIntentId: z.string().min(1),
  clientSecret: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.literal(PAYMENT_CURRENCY),
});
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;

/** Stripe's statuses the webapp distinguishes; anything newer maps onto `other`. */
export const PaymentStatusSchema = z.enum([
  'succeeded',
  'processing',
  'requires_payment_method',
  'requires_action',
  'canceled',
  'other',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/**
 * The intent as Stripe reports it, read back by the api at verification time.
 * `fromKangTea` is whether the intent's metadata carries our tag, so a foreign intent is refused.
 */
export const PaymentStatusResponseSchema = z.object({
  paymentIntentId: z.string().min(1),
  status: PaymentStatusSchema,
  amountCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  fromKangTea: z.boolean(),
});
export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>;
```

In `packages/shared/src/order.ts`, add to the `OrderSchema` object, after `freeDrink`:

```ts
    /** The Stripe PaymentIntent that paid for this order; absent when nothing was payable. */
    paymentIntentId: z.string().min(1).optional(),
```

In `packages/shared/src/index.ts`, add after the order block:

```ts
export {
  PAYMENT_CURRENCY,
  PaymentIntentRequestSchema,
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
  PaymentStatusSchema,
} from './payment.js';
export type {
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentStatus,
  PaymentStatusResponse,
} from './payment.js';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @bbt/shared test && pnpm --filter @bbt/shared lint && pnpm --filter @bbt/shared typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "Add the payment contract to the shared package"
```

---

### Task 2: STRIPE_SECRET_KEY in the api environment

**Files:**
- Modify: `api/src/env.ts`
- Modify: `api/.env.example`
- Modify: `api/test/env.test.ts`

**Interfaces:**
- Produces: `Env.STRIPE_SECRET_KEY?: string` (undefined when unset or empty).

- [ ] **Step 1: Write the failing test**

Add to `api/test/env.test.ts`, matching the file's existing style of calling `loadEnv` with a source object:

```ts
it('reads STRIPE_SECRET_KEY and treats an empty value as unset', () => {
  expect(loadEnv({ STRIPE_SECRET_KEY: 'sk_test_x' }).STRIPE_SECRET_KEY).toBe('sk_test_x');
  expect(loadEnv({}).STRIPE_SECRET_KEY).toBeUndefined();
  expect(loadEnv({ STRIPE_SECRET_KEY: '' }).STRIPE_SECRET_KEY).toBeUndefined();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @bbt/api test -- test/env.test.ts`
Expected: FAIL, `STRIPE_SECRET_KEY` is not on `Env`.

- [ ] **Step 3: Implement**

In `api/src/env.ts` add to `EnvSchema`:

```ts
  /** Stripe secret key. Absent means the payment routes answer 503. */
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
```

And in `loadEnv`, inside the `EnvSchema.parse({...})` object:

```ts
    STRIPE_SECRET_KEY: source.STRIPE_SECRET_KEY || undefined,
```

Append to `api/.env.example`:

```
# Stripe secret key (test mode: sk_test_...). Leave unset to turn payments off; /payments answers 503.
# STRIPE_SECRET_KEY=sk_test_xxx
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @bbt/api test -- test/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/env.ts api/.env.example api/test/env.test.ts
git commit -m "Read the Stripe secret key from the api environment"
```

---

### Task 3: PaymentsProvider seam

**Files:**
- Create: `api/src/payments/types.ts`
- Create: `api/src/payments/unavailable.ts`
- Create: `api/src/payments/stripe.ts`

**Interfaces:**
- Produces:
  - `interface PaymentsProvider { createIntent(amountCents: number, metadata: Record<string, string>): Promise<CreatedIntent>; getIntent(id: string): Promise<IntentDetails>; }`
  - `interface CreatedIntent { id: string; clientSecret: string }`
  - `interface IntentDetails { id: string; status: string; amountCents: number; currency: string; metadata: Record<string, string> }`
  - `class PaymentsError extends Error { code: 'unavailable' | 'not-found' }`
  - `createUnavailablePayments(): PaymentsProvider`
  - `createStripePayments(secretKey: string): PaymentsProvider`
- Consumed by: Task 5 routes and deps; Task 5's tests build a fake implementing `PaymentsProvider`.

- [ ] **Step 1: Install the Stripe SDK**

Run: `pnpm --filter @bbt/api add stripe`

- [ ] **Step 2: Write the types and implementations**

This task is interface and adapter code; the behaviour is tested through the routes in Task 5 (fake and unavailable providers) and manually against Stripe test mode at the end.

Create `api/src/payments/types.ts`:

```ts
/** A PaymentIntent freshly created for a cart. The client secret goes to Stripe.js only. */
export interface CreatedIntent {
  id: string;
  clientSecret: string;
}

/** A PaymentIntent as the provider reports it at verification time. */
export interface IntentDetails {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, string>;
}

/**
 * Where payments happen. Like `AccountsProvider`, this is the seam: routes and tests only know
 * this interface, and the Stripe SDK lives behind it in `stripe.ts`.
 */
export interface PaymentsProvider {
  createIntent(amountCents: number, metadata: Record<string, string>): Promise<CreatedIntent>;
  /** Throws `PaymentsError('not-found')` for an id Stripe does not know. */
  getIntent(id: string): Promise<IntentDetails>;
}

export type PaymentsErrorCode = 'unavailable' | 'not-found';

export class PaymentsError extends Error {
  constructor(
    readonly code: PaymentsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentsError';
  }
}
```

Create `api/src/payments/unavailable.ts`:

```ts
import { PaymentsError, type PaymentsProvider } from './types.js';

/** Used when STRIPE_SECRET_KEY is unset: every call answers that payments are off. */
export function createUnavailablePayments(): PaymentsProvider {
  const refuse = () => {
    throw new PaymentsError('unavailable', 'Payments are not configured');
  };
  return { createIntent: async () => refuse(), getIntent: async () => refuse() };
}
```

Create `api/src/payments/stripe.ts`:

```ts
import { PAYMENT_CURRENCY } from '@bbt/shared';
import Stripe from 'stripe';
import { PaymentsError, type PaymentsProvider } from './types.js';

/**
 * The real provider over the official SDK. Automatic payment methods let the Payment Element
 * decide what to offer; in test mode that is cards.
 */
export function createStripePayments(secretKey: string): PaymentsProvider {
  const stripe = new Stripe(secretKey);
  return {
    async createIntent(amountCents, metadata) {
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: PAYMENT_CURRENCY,
        automatic_payment_methods: { enabled: true },
        metadata,
      });
      if (!intent.client_secret) {
        throw new Error(`Stripe returned no client secret for ${intent.id}`);
      }
      return { id: intent.id, clientSecret: intent.client_secret };
    },
    async getIntent(id) {
      try {
        const intent = await stripe.paymentIntents.retrieve(id);
        return {
          id: intent.id,
          status: intent.status,
          amountCents: intent.amount,
          currency: intent.currency,
          metadata: intent.metadata ?? {},
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
          throw new PaymentsError('not-found', `No payment ${id}`);
        }
        throw error;
      }
    },
  };
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `pnpm --filter @bbt/api typecheck && pnpm --filter @bbt/api lint`
Expected: PASS.

```bash
git add api/src/payments api/package.json pnpm-lock.yaml
git commit -m "Add the payments provider seam with Stripe and unavailable implementations"
```

---

### Task 4: Server-side cart pricing

**Files:**
- Create: `api/src/payments/pricing.ts`
- Create: `api/test/pricing.test.ts`

**Interfaces:**
- Consumes: `Menu`, `OrderLine`, `FreeDrink` from `@bbt/shared`.
- Produces: `priceLines(menu: Menu, lines: readonly OrderLine[], freeDrink?: FreeDrink): number` (payable cents) and `class PricingError extends Error`.

- [ ] **Step 1: Write the failing tests**

Create `api/test/pricing.test.ts`:

```ts
import type { Menu } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { priceLines, PricingError } from '../src/payments/pricing.js';

const menu: Menu = {
  categories: [{ id: 'fruit-tea', name: 'Fruit Tea', sortOrder: 0 }],
  items: [
    {
      id: 'orange-green-tea',
      categoryId: 'fruit-tea',
      name: 'Orange Green Tea',
      priceCents: 800,
      currency: 'AUD',
      tags: [],
      colour: '#F0A640',
      pearls: false,
    },
  ],
  customisations: {
    sugarLevels: [{ id: 'sugar-100', name: '100%', isDefault: true }],
    iceLevels: [{ id: 'ice-standard', name: 'Standard ice', isDefault: true }],
    toppings: [
      { id: 'boba', name: 'Boba', priceCents: 100 },
      { id: 'milk-foam', name: 'Milk Foam', priceCents: 150 },
    ],
  },
};

const line = (overrides: Partial<Parameters<typeof priceLines>[1][number]> = {}) => ({
  itemId: 'orange-green-tea',
  name: 'Orange Green Tea',
  unitPriceCents: 800,
  quantity: 1,
  customisations: [],
  ...overrides,
});

describe('priceLines', () => {
  it('prices a plain line from the menu, not from the client', () => {
    expect(priceLines(menu, [line({ unitPriceCents: 1 })])).toBe(800);
  });

  it('adds toppings by name, times their lots, times the line quantity', () => {
    const priced = priceLines(menu, [
      line({
        quantity: 2,
        customisations: [
          { name: 'Sugar', value: '100%' },
          { name: 'Topping', value: 'Boba', quantity: 2 },
          { name: 'Topping', value: 'Milk Foam' },
        ],
      }),
    ]);
    expect(priced).toBe((800 + 200 + 150) * 2);
  });

  it('takes the free drink base price off, toppings still charged', () => {
    const cart = [line({ customisations: [{ name: 'Topping', value: 'Boba' }] })];
    expect(priceLines(menu, cart, { lineIndex: 0, cents: 800 })).toBe(100);
  });

  it('never prices below zero', () => {
    expect(priceLines(menu, [line()], { lineIndex: 0, cents: 800 })).toBe(0);
  });

  it('throws for a drink or topping the menu does not know', () => {
    expect(() => priceLines(menu, [line({ itemId: 'retired' })])).toThrow(PricingError);
    expect(() =>
      priceLines(menu, [line({ customisations: [{ name: 'Topping', value: 'Gold Leaf' }] })]),
    ).toThrow(PricingError);
  });

  it('throws when the free drink names a line that is not there', () => {
    expect(() => priceLines(menu, [line()], { lineIndex: 3, cents: 800 })).toThrow(PricingError);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @bbt/api test -- test/pricing.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

Create `api/src/payments/pricing.ts`:

```ts
import type { FreeDrink, Menu, OrderLine } from '@bbt/shared';

/** The menu has moved under the cart; the route turns this into a 422 so the client refreshes. */
export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

/** Matches `TOPPING` in webapp/src/store/lines.ts; customisations carry topping names, not ids. */
const TOPPING = 'Topping';

/**
 * Prices the cart from the catalogue, ignoring every client-sent price.
 * A claimed free drink takes the drink's menu price off its line, toppings still charged (ADR 0023).
 */
export function priceLines(
  menu: Menu,
  lines: readonly OrderLine[],
  freeDrink?: FreeDrink,
): number {
  const unitPrice = (line: OrderLine): number => {
    const item = menu.items.find((candidate) => candidate.id === line.itemId);
    if (!item) throw new PricingError(`The menu no longer has ${line.itemId}`);
    const toppings = line.customisations
      .filter((choice) => choice.name === TOPPING)
      .reduce((sum, choice) => {
        const topping = menu.customisations.toppings.find((t) => t.name === choice.value);
        if (!topping) throw new PricingError(`The menu no longer has the topping ${choice.value}`);
        return sum + topping.priceCents * (choice.quantity ?? 1);
      }, 0);
    return item.priceCents + toppings;
  };

  const total = lines.reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0);
  if (!freeDrink) return total;

  const freeLine = lines[freeDrink.lineIndex];
  if (!freeLine) throw new PricingError('The free drink names a line that is not in the cart');
  const base = menu.items.find((candidate) => candidate.id === freeLine.itemId)?.priceCents ?? 0;
  return Math.max(0, total - Math.min(base, unitPrice(freeLine)));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @bbt/api test -- test/pricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/payments/pricing.ts api/test/pricing.test.ts
git commit -m "Price carts on the server from the catalogue"
```

---

### Task 5: Payment routes and wiring

**Files:**
- Create: `api/src/routes/payments.ts`
- Modify: `api/src/create-app.ts` (add `payments` to `AppDeps`, mount the routes)
- Modify: `api/src/deps.ts` (build the provider from the env)
- Modify: `api/test/app.test.ts`, `api/test/auth.test.ts`, `api/test/loyalty.test.ts`, `api/test/catalogue.test.ts` (their `createApp` calls gain `payments: createUnavailablePayments()`)
- Create: `api/test/payments.test.ts`

**Interfaces:**
- Consumes: `PaymentsProvider`, `PaymentsError`, `createUnavailablePayments`, `createStripePayments` (Task 3); `priceLines`, `PricingError` (Task 4); the shared payment schemas (Task 1); `AccountsProvider.resolve`, `LoyaltyProvider.card`, `Catalogue.getMenu`/`getStore`.
- Produces: `POST /payments/intent` answering `PaymentIntentResponse`; `GET /payments/:id` answering `PaymentStatusResponse`; metadata tag `{ source: 'bbt', storeId }`.

- [ ] **Step 1: Write the failing route tests**

Create `api/test/payments.test.ts`:

```ts
import {
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
  LoyaltyCardSchema,
  MeResponseSchema,
} from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { createUnavailableAccounts } from '../src/accounts/unavailable.js';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';
import { createApp } from '../src/create-app.js';
import { createUnavailableLoyalty } from '../src/loyalty/unavailable.js';
import { createUnavailablePayments } from '../src/payments/unavailable.js';
import { PaymentsError, type IntentDetails, type PaymentsProvider } from '../src/payments/types.js';

const env = { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined };
const catalogue = createSeedCatalogue(loadSeed());

/** Records what was created and serves intents back with a settable status. */
function createFakePayments() {
  const intents = new Map<string, IntentDetails>();
  let counter = 0;
  const provider: PaymentsProvider = {
    async createIntent(amountCents, metadata) {
      const id = `pi_${(counter += 1)}`;
      intents.set(id, { id, status: 'requires_payment_method', amountCents, currency: 'aud', metadata });
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
  user: { id: 'u1', email: 't@example.com', displayName: 'T' },
  account: { displayName: 'T', email: 't@example.com', marketingOptIn: false, createdAt: '2026-01-01T00:00:00.000Z' },
});
const accountsWithToken = {
  ...createUnavailableAccounts(),
  resolve: async (token: string) => (token === 'good' ? me : null),
};
const loyaltyWithFreeDrink = {
  ...createUnavailableLoyalty(),
  card: async () =>
    LoyaltyCardSchema.parse({
      stampsPerCard: 10,
      stamps: [],
      earned: 10,
      redeemed: 0,
      available: 1,
      complete: true,
    }),
};

function buildApp(payments: PaymentsProvider, overrides: Partial<Parameters<typeof createApp>[1]> = {}) {
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
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });

describe('POST /payments/intent', () => {
  it('prices the cart from the catalogue and creates a tagged intent', async () => {
    const { provider, intents } = createFakePayments();
    const res = await postIntent(buildApp(provider), { lines: [cartLine], expectedTotalCents: 900 });
    expect(res.status).toBe(200);
    const body = PaymentIntentResponseSchema.parse(await res.json());
    expect(body.amountCents).toBe(900);
    expect(body.currency).toBe('aud');
    expect(intents.get(body.paymentIntentId)?.metadata).toMatchObject({ source: 'bbt' });
  });

  it('refuses a total that disagrees with the server price', async () => {
    const { provider, intents } = createFakePayments();
    const res = await postIntent(buildApp(provider), { lines: [cartLine], expectedTotalCents: 100 });
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
    expect(body).toMatchObject({ status: 'succeeded', amountCents: 900, currency: 'aud', fromKangTea: true });
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @bbt/api test -- test/payments.test.ts`
Expected: FAIL, `payments` is not on `AppDeps` and the route module does not exist.

- [ ] **Step 3: Implement the routes**

Create `api/src/routes/payments.ts`:

```ts
import {
  PAYMENT_CURRENCY,
  PaymentIntentRequestSchema,
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
  PaymentStatusSchema,
} from '@bbt/shared';
import { Hono, type Context } from 'hono';
import type { AccountsProvider } from '../accounts/types.js';
import type { Catalogue } from '../catalogue/types.js';
import type { LoyaltyProvider } from '../loyalty/types.js';
import { priceLines, PricingError } from '../payments/pricing.js';
import { PaymentsError, type PaymentsProvider } from '../payments/types.js';

/** The metadata tag that marks an intent as ours; verification refuses intents without it. */
const SOURCE_TAG = 'bbt';

function bearerToken(c: Context): string | null {
  const match = c.req.header('authorization')?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

async function jsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function handleError(c: Context, error: unknown): Response {
  if (error instanceof PaymentsError) {
    return c.json({ error: error.message }, error.code === 'not-found' ? 404 : 503);
  }
  if (error instanceof PricingError) {
    return c.json({ error: error.message }, 422);
  }
  throw error;
}

/**
 * Payment intents, priced on the server and verified against Stripe.
 * The client's expectedTotalCents is only ever compared, never charged.
 */
export const paymentsRoutes = (
  payments: PaymentsProvider,
  catalogue: Catalogue,
  accounts: AccountsProvider,
  loyalty: LoyaltyProvider,
) => {
  const routes = new Hono();

  routes.post('/intent', async (c) => {
    try {
      const parsed = PaymentIntentRequestSchema.safeParse(await jsonBody(c));
      if (!parsed.success) {
        return c.json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
      }
      const { lines, expectedTotalCents, freeDrink } = parsed.data;
      if (freeDrink) {
        const token = bearerToken(c);
        const me = token ? await accounts.resolve(token) : null;
        if (!me) return c.json({ error: 'Sign in to use the free drink' }, 401);
        const card = await loyalty.card(me.user.id);
        if (card.available < 1) return c.json({ error: 'No free drink on the card' }, 409);
      }
      const menu = await catalogue.getMenu();
      const totalCents = priceLines(menu, lines, freeDrink);
      if (totalCents <= 0) {
        return c.json({ error: 'Nothing to pay; place the order directly' }, 422);
      }
      if (totalCents !== expectedTotalCents) {
        return c.json(
          { error: 'The menu has changed; refresh and try again', serverTotalCents: totalCents },
          409,
        );
      }
      const store = await catalogue.getStore();
      const created = await payments.createIntent(totalCents, {
        source: SOURCE_TAG,
        storeId: store.id,
      });
      return c.json(
        PaymentIntentResponseSchema.parse({
          paymentIntentId: created.id,
          clientSecret: created.clientSecret,
          amountCents: totalCents,
          currency: PAYMENT_CURRENCY,
        }),
      );
    } catch (error) {
      return handleError(c, error);
    }
  });

  routes.get('/:id', async (c) => {
    try {
      const details = await payments.getIntent(c.req.param('id'));
      const known = PaymentStatusSchema.safeParse(details.status);
      return c.json(
        PaymentStatusResponseSchema.parse({
          paymentIntentId: details.id,
          status: known.success ? known.data : 'other',
          amountCents: details.amountCents,
          currency: details.currency,
          fromKangTea: details.metadata.source === SOURCE_TAG,
        }),
      );
    } catch (error) {
      return handleError(c, error);
    }
  });

  return routes;
};
```

In `api/src/create-app.ts`:

```ts
import type { PaymentsProvider } from './payments/types.js';
import { paymentsRoutes } from './routes/payments.js';

export interface AppDeps {
  catalogue: Catalogue;
  accounts: AccountsProvider;
  loyalty: LoyaltyProvider;
  payments: PaymentsProvider;
}
```

And mount after the loyalty route:

```ts
  app.route('/payments', paymentsRoutes(deps.payments, deps.catalogue, deps.accounts, deps.loyalty));
```

In `api/src/deps.ts`, both branches gain a payments entry built once at the top:

```ts
import { createStripePayments } from './payments/stripe.js';
import { createUnavailablePayments } from './payments/unavailable.js';

  const payments = env.STRIPE_SECRET_KEY
    ? createStripePayments(env.STRIPE_SECRET_KEY)
    : createUnavailablePayments();
  if (!env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY is not set. Payments are off; /payments answers 503.');
  }
```

Add `payments` to both returned objects.
Every existing test that calls `createApp` (`app.test.ts`, `auth.test.ts`, `loyalty.test.ts`, `catalogue.test.ts`) gains `payments: createUnavailablePayments()` in its deps object, importing from `../src/payments/unavailable.js`.

- [ ] **Step 4: Run the whole api suite**

Run: `pnpm --filter @bbt/api test && pnpm --filter @bbt/api lint && pnpm --filter @bbt/api typecheck`
Expected: PASS, including the untouched suites.

- [ ] **Step 5: Commit**

```bash
git add api/src api/test
git commit -m "Serve payment intents priced from the catalogue and verified against Stripe"
```

---

### Task 6: Webapp config and api client

**Files:**
- Modify: `webapp/src/config.ts`
- Modify: `webapp/src/api/client.ts`
- Modify: `webapp/src/api/client.test.ts`

**Interfaces:**
- Produces: `stripePublishableKey(): string` (empty string means payments are off); `createPaymentIntent(request: PaymentIntentRequest, token?: string): Promise<PaymentIntentResponse>`; `fetchPaymentStatus(paymentIntentId: string): Promise<PaymentStatusResponse>`.

- [ ] **Step 1: Write the failing tests**

Add to `webapp/src/api/client.test.ts`, following the file's `fakeFetch(status, body)` pattern:

```ts
import { createPaymentIntent, fetchPaymentStatus } from './client';

const intentResponse = {
  paymentIntentId: 'pi_1',
  clientSecret: 'pi_1_secret',
  amountCents: 900,
  currency: 'aud',
};

describe('createPaymentIntent', () => {
  it('posts the cart with the bearer token and parses the response', async () => {
    const impl = fakeFetch(200, intentResponse);
    const request = { lines: [lineFixture], expectedTotalCents: 900 };
    await expect(createPaymentIntent(request, 'tok', impl)).resolves.toEqual(intentResponse);
    const [url, init] = impl.mock.calls[0]!;
    expect(url).toBe('http://localhost:3000/payments/intent');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('throws the api error on a 409', async () => {
    const failing = createPaymentIntent(
      { lines: [lineFixture], expectedTotalCents: 1 },
      undefined,
      fakeFetch(409, { error: 'The menu has changed; refresh and try again' }),
    );
    await expect(failing).rejects.toThrow('The menu has changed');
  });
});

describe('fetchPaymentStatus', () => {
  it('reads a verified status back', async () => {
    const status = { paymentIntentId: 'pi_1', status: 'succeeded', amountCents: 900, currency: 'aud', fromKangTea: true };
    await expect(fetchPaymentStatus('pi_1', fakeFetch(200, status))).resolves.toEqual(status);
  });
});
```

`lineFixture` is any valid `OrderLine` literal; reuse one already in the file or declare `{ itemId: 'x', name: 'X', unitPriceCents: 900, quantity: 1, customisations: [] }`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @bbt/webapp test -- client`
Expected: FAIL, the functions do not exist.

- [ ] **Step 3: Implement**

In `webapp/src/config.ts`:

```ts
/**
 * Stripe publishable key. Read at call time so tests can stub the env.
 * Empty means payments are off and placing an order behaves as before payments existed.
 */
export function stripePublishableKey(): string {
  return (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
}
```

In `webapp/src/api/client.ts`, extend the shared imports with `PaymentIntentResponseSchema`, `PaymentStatusResponseSchema`, and the `PaymentIntentRequest`, `PaymentIntentResponse`, `PaymentStatusResponse` types, then add:

```ts
export function createPaymentIntent(
  request: PaymentIntentRequest,
  token?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PaymentIntentResponse> {
  return requestJson('/payments/intent', PaymentIntentResponseSchema, {
    method: 'POST',
    body: request,
    ...(token ? { token } : {}),
    fetchImpl,
  });
}

export function fetchPaymentStatus(
  paymentIntentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PaymentStatusResponse> {
  return requestJson(`/payments/${paymentIntentId}`, PaymentStatusResponseSchema, { fetchImpl });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @bbt/webapp test -- client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/config.ts webapp/src/api
git commit -m "Reach the payment routes from the webapp client"
```

---

### Task 7: Checkout helpers and the paid order record

**Files:**
- Create: `webapp/src/lib/checkout.ts`
- Create: `webapp/src/lib/checkout.test.ts`
- Modify: `webapp/src/store/types.ts` (`OrdersStore.place` gains `paymentIntentId`)
- Modify: `webapp/src/store/local.ts` (record it on the order)
- Modify: `webapp/src/store/local.test.ts` (or the file holding the orders store tests)
- Modify: `webapp/src/components/order/OrderPanel.tsx` (use the helper instead of its inline free drink logic)

**Interfaces:**
- Consumes: `LoyaltyState` from `loyalty/LoyaltyProvider`, `CatalogueState` as `useCatalogue` exposes it, `orderTotalCents` from `@bbt/shared`.
- Produces: `freeDrinkFor(cart: readonly OrderLine[], menu: Menu | undefined, loyalty: LoyaltyState): FreeDrink | undefined`; `OrdersStore.place(lines, storeId, now?, freeDrink?, paymentIntentId?)`.

- [ ] **Step 1: Write the failing tests**

Create `webapp/src/lib/checkout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTestStores, menuItemFixture } from '../store/testing';
import { freeDrinkFor } from './checkout';

const item = menuItemFixture({ id: 'milk-tea', priceCents: 700 });
const menu = {
  categories: [{ id: 'c', name: 'C', sortOrder: 0 }],
  items: [item],
  customisations: { sugarLevels: [], iceLevels: [], toppings: [] },
};
const line = { itemId: 'milk-tea', name: 'Milk Tea', unitPriceCents: 800, quantity: 1, customisations: [] };
const readyCard = (available: number) =>
  ({ kind: 'ready', card: { stampsPerCard: 10, stamps: [], earned: 10, redeemed: 0, available, complete: available > 0 } }) as const;

describe('freeDrinkFor', () => {
  it('is the first line at its base menu price when a redemption is available', () => {
    expect(freeDrinkFor([line], menu, readyCard(1))).toEqual({ lineIndex: 0, cents: 700 });
  });

  it('is nothing without an available redemption, a cart, or a loyalty card', () => {
    expect(freeDrinkFor([line], menu, readyCard(0))).toBeUndefined();
    expect(freeDrinkFor([], menu, readyCard(1))).toBeUndefined();
    expect(freeDrinkFor([line], menu, { kind: 'signed-out' })).toBeUndefined();
  });

  it('never exceeds the line price when the menu price is higher', () => {
    const cheap = { ...line, unitPriceCents: 500 };
    expect(freeDrinkFor([cheap], menu, readyCard(1))).toEqual({ lineIndex: 0, cents: 500 });
  });
});
```

Add to the orders store tests (beside the existing `place` tests in `webapp/src/store/local.test.ts`):

```ts
it('records the payment intent on a paid order', () => {
  const { stores } = createTestStores();
  const order = stores.orders.place([lineFixture()], 'store-1', new Date(), undefined, 'pi_1');
  expect(order.paymentIntentId).toBe('pi_1');
  expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
});
```

Use the line fixture that file already has; if it has none, declare one as in Task 6.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @bbt/webapp test -- checkout local`
Expected: FAIL, module and parameter missing.

- [ ] **Step 3: Implement**

Create `webapp/src/lib/checkout.ts`:

```ts
import type { FreeDrink, Menu, OrderLine } from '@bbt/shared';
import type { LoyaltyState } from '../loyalty/LoyaltyProvider';

/**
 * The loyalty free drink this cart can claim: the first drink at its menu price without toppings,
 * capped at the line price (ADR 0023). One definition for the order panel and the pay page.
 */
export function freeDrinkFor(
  cart: readonly OrderLine[],
  menu: Menu | undefined,
  loyalty: LoyaltyState,
): FreeDrink | undefined {
  if (loyalty.kind !== 'ready' || loyalty.card.available < 1) return undefined;
  const first = cart[0];
  if (!first || !menu) return undefined;
  const base = menu.items.find((item) => item.id === first.itemId)?.priceCents;
  if (base === undefined) return undefined;
  return { lineIndex: 0, cents: Math.min(first.unitPriceCents, base) };
}
```

In `webapp/src/store/types.ts`, `OrdersStore.place` becomes:

```ts
  /** Creates a received order. A free drink comes off the total; a paid order records its intent. */
  place(
    lines: CartLine[],
    storeId: string,
    now?: Date,
    freeDrink?: FreeDrink,
    paymentIntentId?: string,
  ): Order;
```

In `webapp/src/store/local.ts`, the `place` implementation takes the new parameter and spreads it into the order literal:

```ts
      ...(paymentIntentId ? { paymentIntentId } : {}),
```

In `webapp/src/components/order/OrderPanel.tsx`, delete the inline `freeDrink` IIFE and `basePriceFor`, and replace with:

```ts
  const menu = catalogue.kind === 'ready' ? catalogue.menu : undefined;
  const freeDrink = freeDrinkFor(cart, menu, loyalty.state);
```

importing `freeDrinkFor` from `../../lib/checkout`.

- [ ] **Step 4: Run the webapp suite**

Run: `pnpm --filter @bbt/webapp test && pnpm --filter @bbt/webapp typecheck`
Expected: PASS, including the untouched OrderPanel tests.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/checkout.ts webapp/src/lib/checkout.test.ts webapp/src/store webapp/src/components/order/OrderPanel.tsx
git commit -m "Share the free drink rule and record the payment intent on orders"
```

---

### Task 8: Place order branches to /pay

**Files:**
- Modify: `webapp/src/components/order/OrderPanel.tsx`
- Modify: `webapp/src/components/order/OrderPanel.test.tsx`

**Interfaces:**
- Consumes: `stripePublishableKey()` (Task 6), `orderTotalCents` from `@bbt/shared`, `useNavigate` from `react-router`.
- Produces: navigation to `/pay` with the cart intact whenever payments are on and something is payable.

- [ ] **Step 1: Write the failing tests**

Add to `webapp/src/components/order/OrderPanel.test.tsx`, following that file's render helper (it renders inside a router; assert on `window.location` or the rendered route the way neighbouring navigation tests do):

```ts
describe('Place order with payments configured', () => {
  beforeEach(() => vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x'));
  afterEach(() => vi.unstubAllEnvs());

  it('navigates to /pay and keeps the cart', async () => {
    const { stores } = renderPanelWithCart();
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(await screen.findByText('Pay for your order')).toBeInTheDocument();
    expect(stores.cart.read()).toHaveLength(1);
    expect(stores.orders.read()).toHaveLength(0);
  });
});

describe('Place order without payments configured', () => {
  it('places immediately as before', async () => {
    const { stores } = renderPanelWithCart();
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(stores.orders.read()).toHaveLength(1);
    expect(stores.cart.read()).toHaveLength(0);
  });
});
```

`renderPanelWithCart` is whatever existing helper the file uses to mount `OrderPanel` with a seeded cart; the `/pay` route can be a stub `<h1>Pay for your order</h1>` element in the test router until Task 9 lands.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @bbt/webapp test -- OrderPanel`
Expected: the new "navigates to /pay" test FAILS (the order is placed immediately today).

- [ ] **Step 3: Implement**

In `OrderPanel.tsx`:

```ts
import { useNavigate } from 'react-router';
import { orderTotalCents } from '@bbt/shared';
import { stripePublishableKey } from '../../config';

  const navigate = useNavigate();
  const place = () => {
    if (!store) return;
    setNotice('');
    // Something to pay and a configured Stripe key: payment happens on /pay before placing.
    if (stripePublishableKey() && orderTotalCents(cart, freeDrink) > 0) {
      navigate('/pay');
      return;
    }
    if (!freeDrink) {
      placeNow(store.id);
      return;
    }
    void loyalty.redeem().then(
      () => placeNow(store.id, freeDrink),
      () => {
        setNotice('We could not use your free drink just now, so it stays on your card.');
        placeNow(store.id);
      },
    );
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @bbt/webapp test -- OrderPanel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/components/order
git commit -m "Send a payable order to the pay page"
```

---

### Task 9: The /pay page

**Files:**
- Create: `webapp/src/pages/PayPage.tsx`
- Create: `webapp/src/pages/PayPage.css`
- Create: `webapp/src/pages/PayPage.test.tsx`
- Modify: `webapp/src/router.tsx` (add the `pay` route)

**Interfaces:**
- Consumes: `createPaymentIntent`, `fetchPaymentStatus`, `ApiError` (Task 6); `freeDrinkFor` (Task 7); `stripePublishableKey()`; `useStores`, `useCart`, `useStoreInfo`, `useCatalogue`, `useLoyalty`, `useAuth`; `orderTotalCents`, `PAYMENT_CURRENCY` from `@bbt/shared`; `@stripe/stripe-js`, `@stripe/react-stripe-js`.
- Produces: the `/pay` route.

- [ ] **Step 1: Install the Stripe frontend packages**

Run: `pnpm --filter @bbt/webapp add @stripe/stripe-js @stripe/react-stripe-js`

- [ ] **Step 2: Write the failing tests**

Create `webapp/src/pages/PayPage.test.tsx`. Mock the Stripe modules once at the top; every test drives the page through the mocked `confirmPayment` and the mocked api client:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confirmPayment = vi.fn();
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn().mockResolvedValue({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment }),
  useElements: () => ({}),
}));

const createPaymentIntent = vi.fn();
const fetchPaymentStatus = vi.fn();
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  createPaymentIntent: (...args: unknown[]) => createPaymentIntent(...args),
  fetchPaymentStatus: (...args: unknown[]) => fetchPaymentStatus(...args),
}));
```

Then, using the project's provider test helpers (`src/test/providers.tsx`) and a memory router whose routes include `{ path: 'pay', element: <PayPage /> }` and `{ path: 'order', element: <h1>Order route</h1> }`:

```tsx
const line = { itemId: 'milk-tea', name: 'Milk Tea', unitPriceCents: 900, quantity: 1, customisations: [] };
const intent = { paymentIntentId: 'pi_1', clientSecret: 'cs_1', amountCents: 900, currency: 'aud' };
const verified = { paymentIntentId: 'pi_1', status: 'succeeded', amountCents: 900, currency: 'aud', fromKangTea: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x');
  createPaymentIntent.mockResolvedValue(intent);
  confirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_1' } });
  fetchPaymentStatus.mockResolvedValue(verified);
});
afterEach(() => vi.unstubAllEnvs());

// renderPay seeds createTestStores with the given cart, wraps PayPage in the same providers the
// OrderPanel tests use, and mounts the memory router at the given path (default '/pay').
// It returns the stores so tests can assert on the cart and orders afterwards.

it('redirects an empty cart to the order page', async () => {
  renderPay({ cart: [] });
  expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
});

it('creates one intent from the cart and shows the amount on the pay button', async () => {
  renderPay({ cart: [line] });
  expect(await screen.findByRole('button', { name: 'Pay $9.00' })).toBeInTheDocument();
  // StrictMode mounts twice; the requested ref must keep it to one intent.
  expect(createPaymentIntent).toHaveBeenCalledTimes(1);
  expect(createPaymentIntent).toHaveBeenCalledWith(
    expect.objectContaining({ expectedTotalCents: 900 }),
    undefined,
  );
});

it('places the order with the intent id after a verified success', async () => {
  const { stores } = renderPay({ cart: [line] });
  await userEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
  expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
  expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
  expect(stores.cart.read()).toHaveLength(0);
});

it('refuses a verified payment whose amount no longer matches the cart', async () => {
  fetchPaymentStatus.mockResolvedValue({ ...verified, amountCents: 100 });
  const { stores } = renderPay({ cart: [line] });
  await userEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('did not match');
  expect(stores.orders.read()).toHaveLength(0);
  expect(stores.cart.read()).toHaveLength(1);
});

it('refuses a payment that is not ours', async () => {
  fetchPaymentStatus.mockResolvedValue({ ...verified, fromKangTea: false });
  const { stores } = renderPay({ cart: [line] });
  await userEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('did not match');
  expect(stores.orders.read()).toHaveLength(0);
});

it('keeps the cart and shows an error when verification fails', async () => {
  fetchPaymentStatus.mockRejectedValue(new Error('api down'));
  const { stores } = renderPay({ cart: [line] });
  await userEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm');
  expect(stores.cart.read()).toHaveLength(1);
  expect(stores.orders.read()).toHaveLength(0);
});

it('shows Stripe errors inline and keeps the cart', async () => {
  confirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } });
  const { stores } = renderPay({ cart: [line] });
  await userEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your card was declined.');
  expect(stores.cart.read()).toHaveLength(1);
  expect(stores.orders.read()).toHaveLength(0);
});

it('verifies a redirect return from the query string without a second confirm', async () => {
  const { stores } = renderPay({ cart: [line], path: '/pay?payment_intent=pi_1' });
  expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
  expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
  expect(confirmPayment).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @bbt/webapp test -- PayPage`
Expected: FAIL, no PayPage module.

- [ ] **Step 4: Implement the page**

Create `webapp/src/pages/PayPage.tsx`:

```tsx
import { orderTotalCents, PAYMENT_CURRENCY, type FreeDrink } from '@bbt/shared';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { createPaymentIntent, fetchPaymentStatus } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { useCatalogue } from '../api/CatalogueProvider';
import { stripePublishableKey } from '../config';
import { freeDrinkFor } from '../lib/checkout';
import { formatPrice } from '../lib/money';
import { useLoyalty } from '../loyalty/LoyaltyProvider';
import { useCart, useStores } from '../store/hooks';
import { useStoreInfo } from '../store/StoresProvider';
import { Loading } from '../components/cup/Loading';
import './PayPage.css';

/** One Stripe.js instance per session, loaded only when someone reaches /pay. */
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> {
  stripePromise ??= loadStripe(stripePublishableKey());
  return stripePromise;
}

/** The Payment Element dressed in the app's own tokens, read from the live theme. */
function appearanceFromTheme() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim() || undefined;
  return {
    variables: {
      colorPrimary: token('--color-accent'),
      colorBackground: token('--color-surface'),
      colorText: token('--color-text'),
      borderRadius: '8px',
      fontSizeBase: '16px',
    },
  };
}

type Checkout =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; clientSecret: string; amountCents: number };

/**
 * Verifies a payment with the api and places the order when it holds up.
 * The three checks from the spec: Stripe says succeeded, the amount equals the cart's total as it
 * stands now, the currency is AUD, and the metadata marks the intent as ours.
 * Resolves to '' on success (the caller navigates away) or to the message to show.
 */
function useVerifiedPlacement(freeDrink: FreeDrink | undefined, storeId: string | undefined) {
  const { cart: cartStore, orders: ordersStore } = useStores();
  const cart = useCart();
  const loyalty = useLoyalty();
  const navigate = useNavigate();

  return async (paymentIntentId: string): Promise<string> => {
    if (!storeId) return 'The store is still loading; try again in a moment.';
    const status = await fetchPaymentStatus(paymentIntentId);
    if (status.status !== 'succeeded') {
      return 'The payment has not gone through yet, so nothing was placed.';
    }
    const expected = orderTotalCents(cart, freeDrink);
    if (!status.fromKangTea || status.currency !== PAYMENT_CURRENCY || status.amountCents !== expected) {
      return 'The payment did not match this order, so nothing was placed.';
    }
    if (freeDrink) {
      // The discount is already in the paid amount; a failed redeem never blocks the paid order.
      await loyalty.redeem().catch(() => undefined);
    }
    ordersStore.place(cart, storeId, new Date(), freeDrink, paymentIntentId);
    cartStore.clear();
    navigate('/order');
    return '';
  };
}

/**
 * Pays for the cart before the order is placed. The cart is the source of truth: the intent is
 * rebuilt from it on mount, and the order is only placed after the api has verified with Stripe
 * that this exact amount, in AUD, on an intent we created, has succeeded.
 */
export function PayPage() {
  const cart = useCart();
  const { catalogue } = useCatalogue();
  const loyalty = useLoyalty();
  const auth = useAuth();
  const store = useStoreInfo();
  const [searchParams] = useSearchParams();
  const [checkout, setCheckout] = useState<Checkout>({ kind: 'loading' });
  const requested = useRef(false);

  const menu = catalogue.kind === 'ready' ? catalogue.menu : undefined;
  const freeDrink = freeDrinkFor(cart, menu, loyalty.state);
  const totalCents = orderTotalCents(cart, freeDrink);
  const placeIfVerified = useVerifiedPlacement(freeDrink, store?.id);
  // A redirect-based payment method lands back here with the intent in the query string.
  const returningIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    if (cart.length === 0 || totalCents <= 0 || requested.current || !menu || !store) return;
    requested.current = true; // StrictMode mounts twice; one intent (or one verification) is enough.
    if (returningIntentId) {
      placeIfVerified(returningIntentId).then(
        (message) => {
          if (message) setCheckout({ kind: 'failed', message });
        },
        () => setCheckout({ kind: 'failed', message: 'We could not confirm the payment.' }),
      );
      return;
    }
    createPaymentIntent(
      { lines: cart, expectedTotalCents: totalCents, ...(freeDrink ? { freeDrink } : {}) },
      auth.session?.token,
    ).then(
      (intent) =>
        setCheckout({ kind: 'ready', clientSecret: intent.clientSecret, amountCents: intent.amountCents }),
      (error: unknown) =>
        setCheckout({
          kind: 'failed',
          message: error instanceof Error ? error.message : 'We could not start the payment.',
        }),
    );
    // The cart cannot change while this page is open in this tab; a change elsewhere is caught at verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, totalCents, menu, store, returningIntentId]);

  if (!stripePublishableKey() || cart.length === 0 || totalCents <= 0) {
    return <Navigate to="/order" replace />;
  }

  return (
    <section className="pay" aria-labelledby="pay-heading">
      <h1 id="pay-heading" className="pay__heading">
        Pay for your order
      </h1>
      {checkout.kind === 'loading' && <Loading label="Preparing your payment" />}
      {checkout.kind === 'failed' && (
        <p className="pay__error" role="alert">
          {checkout.message}
        </p>
      )}
      {checkout.kind === 'ready' && store && (
        <Elements
          stripe={getStripe()}
          options={{ clientSecret: checkout.clientSecret, appearance: appearanceFromTheme() }}
        >
          <CheckoutForm
            amountCents={checkout.amountCents}
            freeDrink={freeDrink}
            storeId={store.id}
          />
        </Elements>
      )}
    </section>
  );
}

type CheckoutFormProps = { amountCents: number; freeDrink?: FreeDrink; storeId: string };

function CheckoutForm({ amountCents, freeDrink, storeId }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const placeIfVerified = useVerifiedPlacement(freeDrink, storeId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const pay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (result.error) {
        setMessage(result.error.message ?? 'The payment did not go through.');
        return;
      }
      if (!result.paymentIntent) {
        setMessage('The payment is still on its way; give it a moment and try again.');
        return;
      }
      setMessage(await placeIfVerified(result.paymentIntent.id));
    } catch {
      setMessage('We could not confirm the payment. Your card may not have been charged; please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pay__form" onSubmit={(event) => void pay(event)}>
      <PaymentElement />
      {message && (
        <p className="pay__error" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="pay__submit" disabled={busy || !stripe}>
        {busy ? 'Paying' : `Pay ${formatPrice(amountCents)}`}
      </button>
      <button type="button" className="pay__back" onClick={() => navigate('/order')}>
        Back to your order
      </button>
    </form>
  );
}
```

Adjust the import paths for `useStoreInfo` and `useCatalogue` to wherever OrderPanel imports them from; follow OrderPanel exactly.

Create `webapp/src/pages/PayPage.css` (mobile first, tokens only, 44px targets):

```css
/* The pay page: one centred column, the Payment Element card, the amount on the button. */
.pay {
  display: grid;
  gap: var(--space-4);
  max-width: 28rem;
  margin: 0 auto;
  padding: var(--space-4);
}

.pay__heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
}

.pay__form {
  display: grid;
  gap: var(--space-4);
}

.pay__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 0.9375rem;
}

.pay__submit {
  min-height: 56px;
  border: 0;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font: inherit;
  font-size: 1.0625rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease);
}

.pay__submit:hover {
  background: var(--color-accent-hover);
}

.pay__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.pay__back {
  min-height: var(--tap-target);
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .pay__submit {
    transition: none;
  }
}
```

In `webapp/src/router.tsx`, add between `order` and `history`:

```tsx
      { path: 'pay', element: <PayPage /> },
```

- [ ] **Step 5: Run the webapp suite and verify it passes**

Run: `pnpm --filter @bbt/webapp test && pnpm --filter @bbt/webapp lint && pnpm --filter @bbt/webapp typecheck && pnpm --filter @bbt/webapp build`
Expected: PASS.

- [ ] **Step 6: Run the responsive-ui skill for the new page**

Verify `/pay` at 390px and 1280px, light and dark, with the payments-off redirect and (if keys are present in the env files) the full Payment Element.
Without keys, verify the fallback: Place order still places immediately.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/pages/PayPage.tsx webapp/src/pages/PayPage.css webapp/src/pages/PayPage.test.tsx webapp/src/router.tsx webapp/package.json pnpm-lock.yaml
git commit -m "Pay for the order on a Stripe Payment Element page before placing it"
```

---

### Task 10: Documentation and the ADR

**Files:**
- Create: `api/knowledge/payments.md`
- Modify: `api/knowledge/INDEX.md` (one line pointing at it)
- Modify: `webapp/knowledge/orders.md` (a "Paying" section and a line in Lifecycle)
- Modify: `webapp/knowledge/navigation.md` (the `/pay` route)
- Create: ADR via the `record-decision` skill

**Interfaces:** none; prose only. One sentence per line in Markdown; never an em dash.

- [ ] **Step 1: Write `api/knowledge/payments.md`**

Cover, in this order: the provider seam (`src/payments/`, Stripe behind it, unavailable without `STRIPE_SECRET_KEY`); the two routes and their status codes (400, 401, 404, 409 twice, 422, 503); server pricing (`pricing.ts`, name-based topping lookup, the `Topping` constant mirroring `webapp/src/store/lines.ts`); the metadata tag `source: 'bbt'`; the three amount checks from the spec; what is out of scope (webhooks, refunds) and why (orders live in the browser).

- [ ] **Step 2: Update the webapp knowledge**

In `orders.md`, add a "Paying" section after "The free drink": payments on when `VITE_STRIPE_PUBLISHABLE_KEY` is set; Place order goes to `/pay` when something is payable; the page rebuilds the intent from the cart; the order is placed only after server verification of status, amount, currency and tag; the free drink is verified at pricing and redeemed after payment; `Order.paymentIntentId` records the receipt.
Update the Lifecycle block's first arrow to show the `/pay` detour.
Add `/pay` to `navigation.md`'s route table.

- [ ] **Step 3: Record the ADR**

Invoke the `record-decision` skill: Stripe as the payment provider through a `PaymentsProvider` seam; intents priced server-side from the catalogue and verified server-side; no webhooks while orders are client-side; the publishable key's absence is the feature switch.

- [ ] **Step 4: Commit**

```bash
git add api/knowledge webapp/knowledge knowledge
git commit -m "Describe the payment flow in the knowledge bases and record the decision"
```

---

### Task 11: Full verification

**Files:** none new.

- [ ] **Step 1: Run the workspace check**

Run: `pnpm format` then `pnpm check` from the repo root.
Expected: exit 0.
Fix anything that fails; never skip or disable a test to get green.

- [ ] **Step 2: Browser-verify the payments-off fallback**

With no Stripe keys in the env files: dev servers up, add a drink, Place order, and confirm the order is placed immediately and `/pay` redirects to `/order`.

- [ ] **Step 3: Browser-verify the paid flow as far as keys allow**

If `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` are present (Tristan plugs them in): add a drink, Place order, land on `/pay`, pay with `4242 4242 4242 4242`, any future expiry, any CVC, and confirm the order appears with the kitchen running and `paymentIntentId` recorded (visible in localStorage `kangtea.orders`).
Also confirm a declined card (`4000 0000 0000 0002`) shows the error inline and keeps the cart.
If the keys are not present, say so in the report: "paid flow not verified: no Stripe keys in the environment".

- [ ] **Step 4: Report**

Use the `verify-all` report shape, stating exactly what ran, what passed, and what could not be verified.
