# 0023 The free drink comes off the next order

Date: 2026-10-03
Status: Accepted. Amends 0019.

## Context

ADR 0019 made redemption a self service tap on the card, confirmed at the counter.
In use that read as a chore, and the full card stayed on screen until it was used, so the next drinks looked as if they earned nothing.
Tristan asked for the tenth drink to simply be free on the next purchase, toppings still charged, and for a card that fills mid order to keep filling into the next card rather than paying out at once.

## Decision

- The card shown is always the one being filled now.
  Stamps past a multiple of ten already sit on the next card.
  A finished card is a free drink waiting, `available` on the card, and the webapp shows a note above the card: "You have a free drink to claim. It comes off your next order."
- When a signed in person places an order while a free drink is waiting, the first drink in the cart is free at its menu price without toppings.
  The webapp redeems on the server first and then places the order with `freeDrink` recorded on it and the total reduced; if redeeming fails the order is placed at full price and the person is told the free drink stays on their card.
- An order that completes a card never discounts itself; the free drink is for the next order.
- The free drink earns no stamp; the paid drinks on the same order do.
- `Order.freeDrink` (line index and cents) is part of the shared contract so History, the order panel and the stamping request all agree on what was free.

## Alternatives considered

- Free the cheapest or the most expensive drink: the first drink is the one the person reached for; no surprise, no tiering.
- Discount the whole line including toppings: toppings are add ons at cost, and "the drink is free" is the promise on the board.
- Pay out a card that fills mid order on that same order: it would discount a drink the person already paid for, and the ten stamps would never be seen full.

## Consequences

- The "Use my free drink" button and its counter confirmation are gone; staff see the free drink line on the order instead.
- `/loyalty/redeem` is called by the order panel at place, never by the card.
- The api's `card()` always returns the in progress card; the api and webapp tests about the shown card changed accordingly.
