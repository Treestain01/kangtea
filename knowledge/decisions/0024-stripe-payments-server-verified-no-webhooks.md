# 0024 Stripe payments, server priced and server verified, without webhooks

Date: 2026-10-08
Status: Accepted

## Context

Orders needed payment before being placed, but cart and orders live entirely in the browser (there are no server-side order records).
The client cannot be trusted to assert an amount, and a payment flow had to work in Stripe test mode with nothing more than two keys in the environment files.

## Decision

Stripe is the payment provider, behind a `PaymentsProvider` seam in the api (`src/payments/`), with the Payment Element on a `/pay` page in the webapp.
The api prices every cart from the catalogue and refuses a disagreeing client total before creating an intent, and the webapp places an order only after the api reads the intent back from Stripe and reports a succeeded status with the matching amount, the pinned `aud` currency and our metadata tag.
There are no webhooks; the absence of `VITE_STRIPE_PUBLISHABLE_KEY` is the feature switch, and ordering without it behaves as before payments existed.

## Alternatives considered

- Trusting the client's confirmPayment result: least code, but any client could claim success for a cheaper or foreign intent.
- Webhooks as the source of truth: production grade, but with orders in the browser there is nothing server side for a webhook to update, and local testing would need the Stripe CLI and a signing secret.
- Trusting the client's total when creating the intent: a tampered cart or stale menu could mischarge; pricing from the catalogue costs one lookup.

## Consequences

Payments work locally and in test mode with only the two keys, and every amount is validated three times (creation pricing, pinned currency, verification against Stripe's record).
Moving orders to the api later is the moment to add webhooks and server-side payment records; this ADR should be superseded then.
The free drink is verified at pricing time and redeemed after payment, so a failed redeem after a discounted payment costs the shop one unredeemed stamp rather than blocking the order.
Watch for: the `Topping` customisation name in `api/src/payments/pricing.ts` mirrors `webapp/src/store/lines.ts` and must move with it.
