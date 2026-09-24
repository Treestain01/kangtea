# Orders, History and Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Order, History and Account pages, a tab bar, a local first cart and order lifecycle, and the shared contract shapes behind them.

**Architecture:** `packages/shared` gains `Order`, `OrderLine`, `OrderStatus`, `Account`. The webapp gains a `store/` layer (three `localStorage` backed stores behind interfaces, read through `useSyncExternalStore`), a simulated kitchen in one file, React Router with an `AppShell` layout and `TabBar`, and three pages. The API is untouched this round.

**Tech Stack:** Zod 4, React 19, React Router 7, Vitest, React Testing Library, existing theme tokens.

**Spec:** `docs/superpowers/specs/2026-09-24-orders-history-account-design.md`

## Global Constraints

- All webapp colours via `var(--color-*)`, depth via `--shadow-*` tokens only, breakpoints 768 and 1024 only, tappable elements 44px. `src/theme/tokens.test.ts` enforces the first three.
- Test first for every unit; pages tested under `MemoryRouter` with in memory stores via `StoresProvider`.
- No em dashes, one sentence per line in Markdown, no agent co-author lines in commits.
- Storage keys: `kangtea.cart`, `kangtea.orders`, `kangtea.account`.
- Progress schedule: `making` 20 000 ms after `placedAt`, `ready` 60 000 ms after `placedAt`.
- The API is not changed. The `/store` endpoint supplies `storeId` and the Account store card.

---

## File Structure

```
packages/shared/src/order.ts            OrderLine, OrderStatus, Order, orderLinesTotalCents
packages/shared/src/account.ts          Account
packages/shared/test/{order,account}.test.ts
webapp/src/store/types.ts               CartStore, OrdersStore, AccountStore, Stores
webapp/src/store/local.ts               createLocalStores(storage)
webapp/src/store/orders.ts              activeOrder, pastOrders, cartTotalCents, summariseLines
webapp/src/store/orderProgress.ts       startOrderProgress(orders, schedule, now)
webapp/src/store/StoresProvider.tsx     context + useStores()
webapp/src/store/hooks.ts               useCart, useOrders, useAccount
webapp/src/store/*.test.ts(x)
webapp/src/router.tsx                   createBrowserRouter with AppShell layout
webapp/src/main.tsx                     StoresProvider, RouterProvider, startOrderProgress
webapp/src/App.tsx                      removed (router replaces it); App.test.tsx removed
webapp/src/components/layout/AppShell.tsx + .css      Outlet inside .app, TabBar
webapp/src/components/layout/TabBar.tsx + .css        tabs, badge, sidebar from 1024px
webapp/src/components/order/CartLineRow.tsx + .css    line with quantity controls
webapp/src/components/order/OrderStatusSteps.tsx + .css
webapp/src/pages/{OrderPage,HistoryPage,AccountPage,NotFoundPage}.tsx + .css + tests
webapp/src/components/menu/DrinkCard.tsx              Add button
webapp/src/pages/HomePage.tsx                         live region on add
webapp/knowledge/{orders,navigation}.md, INDEX.md, home-screen.md; webapp/CLAUDE.md
```

---

### Task 1: Contract

**Files:** `packages/shared/src/order.ts`, `packages/shared/src/account.ts`, `packages/shared/src/index.ts`, tests.

**Produces:** `CustomisationSchema`, `OrderLineSchema`, `OrderStatusSchema`, `PickupCodeSchema`, `OrderSchema`, `orderLinesTotalCents(lines): number`, `AccountSchema`, and types `Customisation`, `OrderLine`, `OrderStatus`, `Order`, `Account`.

- [ ] Write `test/order.test.ts`: valid order passes; `totalCents` mismatch fails; `quantity: 0` fails; empty `lines` fails; `pickupCode: 'ab12'` fails (lowercase); status `'paid'` fails; `orderLinesTotalCents` of two lines (2 × 750, 1 × 790) is 2290.
- [ ] Write `test/account.test.ts`: valid account passes; blank `displayName` fails; `email: 'nope'` fails; missing `phone` and `email` pass.
- [ ] Run, see both fail on missing modules.
- [ ] Implement `order.ts` and `account.ts` per the spec section 2, export from `index.ts`.
- [ ] Run shared test, lint, typecheck. Commit "Add Order and Account schemas to the shared contract".

---

### Task 2: Store layer

**Files:** `webapp/src/store/types.ts`, `local.ts`, `orders.ts`, `hooks.ts`, `StoresProvider.tsx`, tests.

**Produces:** the interfaces from spec 3.1; `createLocalStores(storage: Storage): Stores`; `createMemoryStorage(): Storage` (test helper in `store/testing.ts`); `activeOrder`, `pastOrders`, `cartTotalCents`, `summariseLines(lines): string` ("2 × Signature Milk Tea, 1 × Matcha Latte"); `StoresProvider`, `useStores`, `useCart`, `useOrders`, `useAccount`.

Key implementation, `local.ts`:

```ts
function createKeyStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, empty: T) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;
  const read = (): T => {
    if (cache !== undefined) return cache;
    const raw = storage.getItem(key);
    if (raw === null) return (cache = empty);
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      if (parsed.success) return (cache = parsed.data);
    } catch {
      /* fall through */
    }
    storage.removeItem(key);
    return (cache = empty);
  };
  const write = (value: T) => {
    cache = value;
    storage.setItem(key, JSON.stringify(value));
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return { read, write, subscribe };
}
```

`place` builds an `Order`: `id` = `crypto.randomUUID()`, `pickupCode` from 4 random chars of `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I), `totalCents` = `orderLinesTotalCents`, `status: 'received'`, timestamps from `now`. Validate with `OrderSchema.parse` before writing.

- [ ] Tests (`local.test.ts`): add merges quantity; `setQuantity(id, 0)` removes; `replace` swaps lines; corrupt JSON in storage resets to empty and removes the key; a stored order failing the schema resets; subscribers fire on write and stop after unsubscribe; `place` returns an `OrderSchema`-valid order, newest first in `read()`, and `setStatus` updates `updatedAt`.
- [ ] Tests (`orders.test.ts`): `activeOrder` picks the received/making/ready one and ignores collected; `pastOrders` newest first; `summariseLines`.
- [ ] Tests (`hooks.test.tsx`): `useCart` re-renders when the store writes.
- [ ] Implement, run, commit "Add local first cart, orders and account stores".

---

### Task 3: Simulated kitchen

**File:** `webapp/src/store/orderProgress.ts` + test.

```ts
export type ProgressSchedule = { makingAfterMs: number; readyAfterMs: number };
export const DEFAULT_SCHEDULE = { makingAfterMs: 20_000, readyAfterMs: 60_000 };
export function startOrderProgress(
  orders: OrdersStore,
  schedule = DEFAULT_SCHEDULE,
  now = () => Date.now(),
): () => void;
```

Behaviour: on start and after every store change, find the active order; compute elapsed = now() - placedAt; if status `received` and elapsed >= making → set `making` (and continue); if `making` and elapsed >= ready → set `ready`; otherwise schedule one `setTimeout` for the next threshold. Only one timer at a time. Returns a stop function that clears the timer and unsubscribes.

- [ ] Tests with `vi.useFakeTimers()` and a controllable `now`: placed just now → `making` at 20s, `ready` at 60s; placed 25s ago → `making` immediately, `ready` after 35s more; `collected` orders are ignored; stop cancels.
- [ ] Implement, run, commit "Simulate kitchen progress for local orders".

---

### Task 4: Router, shell and tab bar

**Files:** `router.tsx`, `main.tsx`, `components/layout/AppShell.tsx/.css`, `TabBar.tsx/.css`, `pages/NotFoundPage.tsx`, tests; delete `App.tsx`, `App.test.tsx`.

- `router.tsx`: `createBrowserRouter([{ element: <AppShell />, children: [{ index, HomePage }, { path: 'order', OrderPage }, { path: 'history', HistoryPage }, { path: 'account', AccountPage }, { path: '*', NotFoundPage }] }])`. Export `routes` too so tests can `createMemoryRouter(routes, { initialEntries })`.
- `AppShell`: `<h1 class="visually-hidden">Kang Tea</h1>`, `<main class="app"><Outlet/></main>`, `<TabBar/>`, plus the iOS shell note. `.app` gets `padding-bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + var(--space-4))` below 1024px, and a left margin equal to the sidebar width from 1024px.
- `TabBar`: `NavLink`s for Home `/`, Order `/order`, History `/history`, Account `/account` with inline SVG icons; `aria-current="page"` comes from NavLink; active gets `--shadow-inset` + accent text. Badge: cart line count when > 0; a dot when `activeOrder` exists. Below 1024px: `position: fixed; bottom: 0` with safe area padding, `--shadow-raised` upwards. From 1024px: `position: fixed; left: 0; top: 0; bottom: 0; width: 220px` vertical list, logo mark at top.
- `main.tsx`: wraps `RouterProvider` in `StoresProvider` with `createLocalStores(window.localStorage)`; calls `startOrderProgress(stores.orders)`.
- [ ] Tests: `TabBar` marks the tab for the current route (render inside `MemoryRouter` at `/history`); badge shows `2` for two cart lines; dot when an active order exists; each tab has an accessible name. `AppShell` renders the outlet content and the tab bar. `NotFoundPage` links home.
- [ ] Commit "Add routing, app shell and tab bar".

---

### Task 5: Add to cart from Home

- `DrinkCard` gets `onAdd?: (item: MenuItem) => void`; renders `<button aria-label="Add {name}">` (44px, raised, `+` glyph) when provided.
- `HomePage` passes `onAdd={(item) => { cart.add(item); announce(`Added ${item.name}`); }}` and renders `<p role="status" class="visually-hidden">{announcement}</p>`, cleared after 2 s.
- [ ] Tests: DrinkCard calls `onAdd` with the item; renders no button without the prop. HomePage: clicking Add writes to the cart store and announces.
- [ ] Commit "Add drinks to the cart from the home screen".

---

### Task 6: Order page

**Files:** `pages/OrderPage.tsx/.css`, `components/order/CartLineRow.tsx/.css`, `components/order/OrderStatusSteps.tsx/.css`, tests.

- `OrderPage` needs the store id: it calls `fetchStore()` on mount (same pattern as Home) and disables "Place order" until loaded.
- Cart state per spec 5.2; `CartLineRow` has minus (`aria-label="Remove one {name}"`), count, plus (`aria-label="Add one {name}"`), and remove (`aria-label="Remove {name}"`), all 44px, quantity controls as a raised pill group.
- Status state per spec 5.2; `OrderStatusSteps` renders an ordered list of three steps with `aria-current="step"` on the current one; pickup code in a raised tile at 2.5rem when ready.
- [ ] Tests: empty cart shows the empty state and a link to `/`; lines render with totals; plus and minus change quantity; remove; "Place order" creates an order (store now has an active order) and clears the cart; status view shows Received current; with a `ready` order shows the code and "I've picked it up" which sets collected and returns to the empty cart; "Cancel order" only while received.
- [ ] Commit "Add the Order page with cart and live status".

---

### Task 7: History page

- Per spec 5.3. Date via `new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' })`.
- [ ] Tests: empty state; two past orders newest first with status pills; "Order again" replaces the cart with the order's lines and navigates to `/order`.
- [ ] Commit "Add the History page with reorder".

---

### Task 8: Account page

- Per spec 5.4. Form uses controlled inputs seeded from `useAccount()`; validation through `AccountSchema.safeParse` on submit; per field errors from `issues[].path`.
- Store card fetches `/store`; phone as `tel:` link (digits only in the href); today's hours via `describeOpeningStatus(openingStatus(store))`.
- "Clear my data": first click swaps to a confirm row (Confirm / Keep my data), confirm clears all three stores.
- [ ] Tests: saving a valid profile persists and announces "Saved"; invalid email shows an inline error tied to the field; store card shows address and phone link; clear requires confirmation then empties the stores.
- [ ] Commit "Add the Account page with local profile and store card".

---

### Task 9: Knowledge, verification, end to end

- [ ] `webapp/knowledge/orders.md`: the store layer, the lifecycle, the simulated kitchen (named as fake), how the API replaces it. `webapp/knowledge/navigation.md`: routes, shell, tab bar rules. Update `INDEX.md`, `home-screen.md` (Add button now exists), `webapp/CLAUDE.md` (routes, stores rule: pages read through `useStores`, never `localStorage` directly).
- [ ] `pnpm check`; responsive checklist walked for TabBar, CartLineRow, OrderStatusSteps, pages.
- [ ] On `pnpm dev`: add two drinks, open Order, adjust quantities, place, see Received, wait for Being made, set the schedule short in devtools or wait, collect, see it in History, reorder, save a profile, clear data.
- [ ] Commit "Document orders, navigation and the simulated kitchen".
