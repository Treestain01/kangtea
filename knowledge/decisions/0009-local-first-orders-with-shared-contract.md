# 0009 Local first orders with the shared contract

Date: 2026-09-24
Status: Accepted

## Context

The Order, History and Account pages need a cart, an order lifecycle and a profile.
There is no database, no authentication and no payment provider yet, and the ordering flow itself is still going to change.

## Decision

Define `Order`, `OrderLine`, `OrderStatus` and `Account` in `packages/shared` now.
Store cart, orders and account in the browser (`localStorage`) behind three small store interfaces in `webapp/src/store/`, validated with the shared schemas on every read.
Simulate the kitchen's status progression in one isolated file, `orderProgress.ts`, so the status UI is real while the backend is not.
Collection is the customer's own action.

## Alternatives considered

- Real backend now: authentication, sessions, a hosted database and a security review before any page can be looked at.
- Static mockups: nothing to use, and thrown away once state arrives.
- A state library (Redux, Zustand): three tiny stores with `useSyncExternalStore` need none of it.

## Consequences

- The pages work today on one device; nothing syncs between devices until the API stores orders.
- Replacing local storage with the API changes `store/local.ts` and `store/orderProgress.ts` only, because pages read through the interfaces.
- The simulated progression is the one fake behaviour in the product and `webapp/knowledge/orders.md` names it.
- "Clear my data" is a required feature while data lives on the device.
