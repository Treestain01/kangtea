# Stripe Payments Design

Date: 2026-10-08
Status: Approved for implementation

## 1. Purpose

Take payment for an order before it is placed.
Tapping "Place order" leads to a new `/pay` page where Stripe's Payment Element collects the payment.
A server-verified successful payment then runs today's placement flow unchanged: free drink redemption, `orders.place`, the simulated kitchen, loyalty stamping on collect.
Everything works in Stripe test mode the moment the two keys land in the environment files; no webhooks in this round.

The customer-facing rule: no order is placed without a payment that the api has verified against Stripe, except where there is nothing to pay.

## 2. Flow

```
cart -> Place order
  payments off (no publishable key)  -> place immediately, exactly as today
  total is zero (free drink)         -> place immediately, exactly as today
  otherwise                          -> navigate to /pay
/pay (cart is the source of truth; rebuilt on refresh)
  on mount    -> POST /payments/intent from the cart -> clientSecret
  Payment Element -> confirmPayment (redirect: 'if_required')
  on confirm  -> GET /payments/:id -> api reads the intent back from Stripe
  verified    -> redeem free drink if claimed -> orders.place(..., paymentIntentId) -> clear cart -> /order
  not verified or failed -> error stays on /pay, cart untouched
  back/leave  -> cart untouched
```

An abandoned PaymentIntent is harmless; Stripe expires it.
At most one order is active at a time, as today; `/pay` with an empty cart redirects to `/order`.

## 3. The three amount checks

The client never gets to assert an amount.

1. **Creation.** `POST /payments/intent` prices the cart lines from the catalogue on the server and compares with the client's expected total; a mismatch is a 409 and no intent is created.
2. **Pinned currency.** The contract fixes the currency to `AUD` end to end; the api creates every intent in AUD.
3. **Verification.** `GET /payments/:id` reads the intent back from Stripe and returns its status, amount, currency and our metadata tag. The webapp places the order only when the status is `succeeded`, the amount equals the total it is about to record, the currency is AUD, and the metadata marks the intent as ours. A swapped or reused intent id fails this comparison.

## 4. Contract (`packages/shared`, new `payment.ts`)

```
PAYMENT_CURRENCY           'aud' (literal)
PaymentIntentRequest       { lines: OrderLine[] (min 1), expectedTotalCents, freeDrink?: FreeDrink }
PaymentIntentResponse      { paymentIntentId, clientSecret, amountCents, currency: 'aud' }
PaymentStatusResponse      { paymentIntentId, status, amountCents, currency, fromKangTea: boolean }
PaymentStatus              'succeeded' | 'processing' | 'requires_payment_method' | 'requires_action' | 'canceled' | 'other'
```

- `lines` reuses `OrderLineSchema`; the api re-derives every unit price and ignores the client's `unitPriceCents` except for the mismatch check.
- `fromKangTea` is whether the intent's metadata carries our tag, so the webapp can refuse a foreign intent.
- `Order` gains optional `paymentIntentId`; existing stored orders stay valid, History can show a paid marker later.

## 5. api

### 5.1 Environment

- `STRIPE_SECRET_KEY` joins `src/env.ts` as optional and `.env.example` with a comment.
- When it is unset, the payment routes answer `503 { error: 'Payments are not configured' }`.
- Only `src/env.ts` reads it, as the rules require.

### 5.2 PaymentsProvider (`src/payments/`)

The same provider pattern as accounts and loyalty; routes never import the Stripe SDK.

```ts
interface PaymentsProvider {
  createIntent(amountCents: number, metadata: Record<string, string>): Promise<{ id: string; clientSecret: string }>;
  getIntent(id: string): Promise<{ id: string; status: string; amountCents: number; currency: string; metadata: Record<string, string> }>;
}
```

- `src/payments/stripe.ts`: the official `stripe` npm package, `automatic_payment_methods: { enabled: true }`, metadata `{ source: 'bbt', storeId }`.
- `src/payments/fake.ts` (test helper): records created intents, serves them back with a settable status.
- `createApp(env, deps)` takes `payments` the way it takes `catalogue`, so tests construct it with the fake.

### 5.3 Pricing (`src/payments/pricing.ts`)

- A pure function from catalogue plus lines to total cents.
- Unit price per line: the item's `priceCents` plus each `Topping` customisation priced by topping name times its quantity, times the line quantity.
- Unknown item or topping name: `422`, the menu has moved under the cart and the client should refresh.
- Free drink claimed: requires a bearer token, checks the loyalty card has a redemption available, subtracts the first line's drink price (not toppings), mirroring ADR 0023. No redemption happens at pricing time.
- Totals of zero or less never reach Stripe; the route answers `422` because the webapp should have placed directly.

### 5.4 Routes (`src/routes/payments.ts`)

- `POST /payments/intent`: validate with the shared schema, price, compare with `expectedTotalCents` (mismatch is `409` with both totals), create the intent, answer `PaymentIntentResponse`.
- `GET /payments/:id`: retrieve from Stripe, answer `PaymentStatusResponse` with the status mapped onto `PaymentStatus` and `fromKangTea` from the metadata tag.
- Both parse their responses against the shared schemas before sending, like every other route.

## 6. webapp

### 6.1 Configuration and client

- `VITE_STRIPE_PUBLISHABLE_KEY` read only in `src/config.ts`; empty means payments are off and ordering behaves exactly as today.
- `src/api/client.ts` gains `createPaymentIntent(request)` and `fetchPaymentStatus(id)`, both parsed with the shared schemas.
- New dependencies: `@stripe/stripe-js`, `@stripe/react-stripe-js`.

### 6.2 The /pay page (`pages/PayPage.tsx`)

- Registered in `router.tsx`; phones navigate from the order panel, desktop from the side panel; both land on the same page.
- On mount with a non-empty cart: compute the total and free drink exactly as `OrderPanel` does (the helpers move to a shared module rather than being duplicated), request the intent, then render `<Elements>` with the Payment Element and a pay button labelled with the amount.
- `loadStripe` is called once per session, lazily, so the Stripe script never loads for people who never pay.
- Confirm uses `redirect: 'if_required'`; card payments in test mode complete without leaving the page. If a redirect-based method ever returns, the page re-verifies from the `payment_intent` query parameter on load.
- After a confirmed payment: `fetchPaymentStatus`, apply the section 3 checks, then redeem the free drink if claimed (a failed redeem shows today's notice and never blocks placement), place the order with `paymentIntentId`, clear the cart, navigate to `/order`.
- Payment errors from Stripe render inline under the element; the cart is untouched and the person can retry or go back.
- The Payment Element takes an appearance built from the theme tokens (`--color-surface`, `--color-text`, `--color-accent`, `--color-border`, radius and font), read from computed style at mount so light and dark both look native.

### 6.3 OrderPanel changes

- `place()` becomes: payments off or total zero, place as today; otherwise navigate to `/pay`.
- Free drink redemption moves out of `place()` into the shared placement helper used by both paths, so the no-payment path keeps redeeming before placing and the paid path redeems after verification.

## 7. Testing

- shared: schema tests with passing and failing examples for the three payment shapes and the `Order.paymentIntentId` addition.
- api: pricing unit tests (plain line, toppings with quantities, free drink, unknown item, zero total); route tests through `app.request()` against the fake provider, covering 503 without a key, 409 on total mismatch, 422 on unknown names, happy path, and verification of a foreign intent.
- webapp: PayPage tests with the api client and `@stripe/react-stripe-js` mocked, covering redirect on empty cart, placement only after a verified `succeeded` with matching amount, refusal of a mismatched amount, error display, and cart untouched on failure; OrderPanel tests for the three place paths.
- Browser verification: with test keys in the env files, the full flow with card `4242 4242 4242 4242` at 390px and 1280px in light and dark; without keys, the today-behaviour fallback.

## 8. Environment setup (what Tristan plugs in)

- `api/.env`: `STRIPE_SECRET_KEY=sk_test_...`
- `webapp/.env.local`: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
- The same two variables go into the Vercel projects (api and webapp respectively) when the feature should go live; until then both deployments keep the payments-off behaviour.

## 9. Out of scope

- Webhooks and server-side order records; orders stay in the browser (see `webapp/knowledge/orders.md`).
- Apple Pay and Google Pay domain registration; the Payment Element will offer them automatically once the domains are registered in the Stripe dashboard.
- Refunds, receipts by email, and saved cards.

## 10. Documentation

- New `knowledge/payments.md` in `api` and a payments section in `webapp/knowledge/orders.md`.
- An ADR via `record-decision`: Stripe as the provider, server-priced intents, no webhooks while orders are client-side.
- `.env.example` files updated on both sides.
