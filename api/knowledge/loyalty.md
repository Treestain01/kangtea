# Loyalty

## The rule

One stamp per drink collected, ten stamps to a card, the tenth drink free.
`STAMPS_PER_CARD` in `packages/shared/src/loyalty.ts` is the one place the ten lives.

## The seam

`LoyaltyProvider` in `src/loyalty/types.ts` mirrors the accounts provider:

| Method                 | Does                                                               | Failure                             |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| `card(userId)`         | The card to show: earned, redeemed, available, complete, stamps.   |                                     |
| `earn(userId, stamps)` | Records stamps, skipping any whose `key` exists; returns the card. |                                     |
| `redeem(userId)`       | Uses one free drink; returns the card.                             | `LoyaltyError('nothing-to-redeem')` |

`createPostgresLoyalty` (`src/loyalty/postgres.ts`) is the implementation; `createUnavailableLoyalty` answers 503 without a database.
`createDeps` wires it beside accounts over the same connection.

## Tables

`loyalty_stamps` (id, user_id, stamp_key, item_id, item_name, colour, earned_at) with a unique index on (user_id, stamp_key), and `loyalty_redemptions` (id, user_id, redeemed_at).
Both cascade when a user is deleted.
Migration `drizzle/0002_loyalty.sql`.
The seed never touches them; `db-wipe` drops them.

## Which card is shown

Stamps are ordered by `earned_at` then id; a batch is written one millisecond apart so an order keeps its line order on the card.
Cards are consecutive runs of ten in that order.
`completed = floor(earned / 10)`, `available = completed - redeemed`, `complete = available > 0`.
When complete, the card shown is card number `redeemed` (the oldest not yet redeemed); otherwise it is card number `completed`, the one in progress.
So a full card stays on screen until it is used, and the next drink starts a fresh one.

## Routes

All under `/loyalty`, all needing `Authorization: Bearer <token>`:

| Route          | Body                | Answer                                        |
| -------------- | ------------------- | --------------------------------------------- |
| `GET /card`    |                     | 200 `LoyaltyCard`, 401                        |
| `POST /stamps` | `EarnStampsRequest` | 200 `LoyaltyCard`, 400 issues, 401            |
| `POST /redeem` |                     | 200 `LoyaltyCard`, 401, 409 nothing to redeem |

`POST /stamps` turns each line into `quantity` stamps keyed `<orderId>:<lineIndex>:<n>`, and colours them from the current menu (`catalogue.getMenu()`), falling back to the brand navy for a drink that has left the menu.
The webapp sends it from the order panel when the customer taps that they have picked the drink up (ADR 0019).

## Testing

`test/loyalty.test.ts` runs the routes over the Postgres providers on PGlite: empty card, earning with quantities and colours, idempotent re-sends, the menu fallback colour, filling a card, redeeming, the 409, and two completed cards in a row.

## Not built yet

Staff facing redemption (today the customer taps and shows the screen), expiry, and stamping from real order status once orders live on the server.
