# Payments

## The provider seam

`src/payments/` owns how money moves, behind the `PaymentsProvider` interface in `src/payments/types.ts`.
Routes never import the Stripe SDK; they see `createIntent(amountCents, metadata)` and `getIntent(id)` and nothing else.

| Implementation              | File                          | When                                                                |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `createStripePayments`      | `src/payments/stripe.ts`      | `STRIPE_SECRET_KEY` is set. The official `stripe` package.          |
| `createUnavailablePayments` | `src/payments/unavailable.ts` | The key is unset. Every call throws `PaymentsError('unavailable')`. |

`createDeps` picks one; tests build the app with a fake provider defined in `test/payments.test.ts`.
Intents are created with `automatic_payment_methods` enabled, so the Payment Element decides what to offer.

## Server-side pricing

`src/payments/pricing.ts#priceLines(menu, lines, freeDrink?)` prices a cart from the catalogue and ignores every client-sent price.
A line is its item's `priceCents` plus each `Topping` customisation priced by topping name (the `Topping` constant mirrors `TOPPING` in `webapp/src/store/lines.ts`) times its quantity.
A claimed free drink subtracts the first line's menu price, toppings still charged (ADR 0023), after the loyalty card has confirmed a redemption is available.
An unknown drink or topping name throws `PricingError`: the menu has moved under the cart and the client should refresh.

## Routes

Both routes live in `src/routes/payments.ts` and parse their responses against the shared schemas before sending.

`POST /payments/intent` takes `PaymentIntentRequest` and answers `PaymentIntentResponse`.

| Status | Meaning                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| 400    | The body does not match the schema.                                                                                 |
| 401    | A free drink was claimed without a valid bearer token.                                                              |
| 409    | No free drink on the card, or the client's total disagrees with the server's (the body carries `serverTotalCents`). |
| 422    | Unknown drink or topping, or nothing to pay (the webapp should place directly).                                     |
| 503    | `STRIPE_SECRET_KEY` is unset.                                                                                       |

`GET /payments/:id` reads the intent back from Stripe and answers `PaymentStatusResponse`: the status mapped onto the shared enum (`other` for anything unrecognised), the amount, the currency, and `fromKangTea`, which is whether the metadata carries our `source: 'bbt'` tag.
404 for an id Stripe does not know; 503 without a key.

## The three amount checks

1. Creation prices the cart server-side and refuses a disagreeing client total with a 409, so no mispriced intent ever exists.
2. The currency is pinned to `aud` by the shared contract and on every intent the api creates.
3. The webapp places an order only after `GET /payments/:id` reports `succeeded`, with the amount equal to the total it records, the currency `aud`, and `fromKangTea` true, so a swapped or foreign intent id changes nothing.

## Out of scope, and why

No webhooks and no server-side order records: orders live in the browser (`webapp/knowledge/orders.md`), so there is nothing server-side for a webhook to update yet.
No refunds, receipts or saved cards.
See `knowledge/decisions/` for the ADR.
