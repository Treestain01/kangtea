# 0019 Pearl loyalty card on the server

Date: 2026-09-27
Status: Accepted

## Context

The mockup always had a pearl loyalty card; it was left out for lack of data (ADR 0009).
Accounts now live on the server (ADR 0017), which makes a per person card possible and gives signing in a reason.
Orders are still local first with a simulated kitchen, so the only moment the server can trust is the customer marking a drink as collected.

## Decision

One stamp per drink collected, ten stamps to a card, the tenth drink free.
Stamps and redemptions live in our Postgres tables (`loyalty_stamps`, `loyalty_redemptions`) behind a `LoyaltyProvider` interface in `api/src/loyalty/`, mirroring the accounts provider seam.
The webapp posts the collected order's lines to `/loyalty/stamps` from the order panel; the api derives one stamp per unit of quantity with a key of order id, line index and unit, so re-sending an order never stamps twice.
Each stamp keeps the drink's name and menu colour at the time, so the card shows what was drunk.
The card shown is the oldest completed card not yet redeemed, or the card in progress; redeeming records a row and the next card appears.
On the client, `LoyaltyClient` and `LoyaltyProvider` in `webapp/src/loyalty/` mirror the auth pair; `LoyaltyCard` renders on Home between Your usual and Popular now, and on the Account page.
Signed out, the card is an invitation to sign in.

## Alternatives considered

- Stamping when an order is placed: rewards abandoned orders; collected is the closest thing to a real purchase the app can see today.
- Storing stamps locally like the cart: loses them with the device and cannot be trusted at the counter.
- A points balance instead of stamps: less tangible than ten cups filling up, and the mockup's card is stamps.
- Redeeming automatically on the next order: ordering is not on the server yet, so the customer tells the counter instead, with an in page confirmation so a stray tap does not spend the free drink.

## Consequences

- The customer is trusted when they tap collected. When orders move to the server the stamp should follow the real status change instead, and the client call goes away.
- Redemption is a self service tap with a confirmation, not a staff action. Staff should see the "Free drink used" state on the customer's screen.
- Deleting an account cascades to its stamps and redemptions.
- The card colours are product data; the stamp symbols come from the same SVG part library as the cup, so `CupSprite` now lives in the app shell rather than the customise sheet.
