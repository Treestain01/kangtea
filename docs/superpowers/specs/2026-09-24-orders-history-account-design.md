# Orders, History and Account Design

Date: 2026-09-24
Status: Approved for implementation

## 1. Purpose

Add three pages to the Kang Tea webapp and the navigation between them.

- `/order` Current Order: the cart before an order is placed, the live status after.
- `/history` History: collected and cancelled orders, with reorder.
- `/account` Account: a local profile, the store card, and a way to clear local data.

Everything is local first.
The shared contract defines the shapes the API will serve later; the browser stores the data today.
No sign in, no payments, no drink customisation in this round.

## 2. Contract (`packages/shared`)

```
OrderLine   { itemId, name, unitPriceCents, quantity (>= 1), customisations: Customisation[] }
Customisation { name, value }                       // empty for now; size, sugar, ice later
OrderStatus 'received' | 'making' | 'ready' | 'collected' | 'cancelled'
Order       { id, storeId, lines (>= 1), totalCents, status, placedAt, updatedAt, pickupCode }
Account     { displayName, email?, phone?, marketingOptIn, createdAt }
```

- `OrderLine` snapshots `name` and `unitPriceCents` because menus change and past orders must not.
- `totalCents` must equal the sum of `unitPriceCents * quantity`; the schema refines this.
- `pickupCode` is four uppercase letters or digits.
- `placedAt`, `updatedAt`, `createdAt` are ISO 8601 strings (`z.iso.datetime()`).
- `email` is validated with `z.email()`; `phone` is a non empty string (Australian formats vary too much to regex now).

## 3. Local store layer (`webapp/src/store/`)

### 3.1 Interfaces

```ts
interface CartStore {
  read(): CartLine[]; // CartLine = OrderLine
  add(item: MenuItem): void; // merges by itemId, quantity + 1
  setQuantity(itemId: string, quantity: number): void; // 0 removes
  replace(lines: CartLine[]): void; // used by "Order again"
  clear(): void;
  subscribe(listener: () => void): () => void;
}

interface OrdersStore {
  read(): Order[]; // every order, newest first
  place(lines: CartLine[], storeId: string, now?: Date): Order; // status received
  setStatus(orderId: string, status: OrderStatus, now?: Date): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

interface AccountStore {
  read(): Account | null;
  save(account: Account): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
```

Derived helpers, pure functions in `store/orders.ts`:

- `activeOrder(orders)`: the single order whose status is `received`, `making` or `ready`, or `null`.
- `pastOrders(orders)`: `collected` or `cancelled`, newest first.
- `cartTotalCents(lines)`.

### 3.2 Storage

- One implementation, `createLocalStores(storage: Storage, keys?)`, returns all three stores backed by the given `Storage`.
  Production passes `window.localStorage`; tests pass an in memory fake.
- Keys: `kangtea.cart`, `kangtea.orders`, `kangtea.account`.
- Every read parses with the shared schema. On a parse failure the key is removed and the empty value returned.
  Corrupt data never crashes the app.
- Writes are followed by notifying subscribers.
  A tiny emitter per store, no library.
- React reads through `useSyncExternalStore` via hooks `useCart()`, `useOrders()`, `useAccount()` in `store/hooks.ts`.
  The stores are provided through a `StoresProvider` context so tests can inject fakes.

### 3.3 Simulated kitchen

`store/orderProgress.ts` exports `startOrderProgress(ordersStore, schedule)`.
It watches for an active order and advances it `received -> making` after `schedule.makingAfterMs` (20 000) and `making -> ready` after `schedule.readyAfterMs` (60 000), measured from `placedAt`, so reloading the page resumes correctly.
It returns a stop function.
It is started once in `main.tsx`.
This is the only fake behaviour in the app and `webapp/knowledge/orders.md` says so.
API polling replaces this one file later.

Collection is the customer's action: when the order is `ready`, the Order page shows "I've picked it up", which sets `collected`.

## 4. Navigation

- React Router (`react-router`, declarative `createBrowserRouter` with a layout route).
- Routes: `/` Home, `/order`, `/history`, `/account`.
  Unknown paths render a small not found page with a link home.
- `AppShell` layout: `AppHeader` stays on Home only.
  Every page renders inside `.app` with the existing gutters.
- `TabBar`: fixed to the bottom on phones with `env(safe-area-inset-bottom)` padding, four tabs (Home, Order, History, Account) with icons and labels, each at least 44px tall.
  The Order tab shows a badge with the cart line count, or a dot when an order is active.
  From 1024px the same component renders as a left sidebar and the bottom bar disappears.
  Active tab is `--shadow-inset` with accent text, matching chips.
- `.app` gains bottom padding on phones equal to the tab bar height so content is never hidden behind it.

## 5. Pages

### 5.1 Home changes

- `DrinkCard` gains an "Add" button (`aria-label="Add {name}"`, 44px) that calls `cart.add(item)`.
- A `role="status"` live region in `HomePage` announces "Added Signature Milk Tea" for two seconds.

### 5.2 Order (`/order`)

Two states from `activeOrder(orders)`:

- **Cart** (no active order): list of lines with name, unit price, quantity controls (minus, count, plus, each 44px), remove; total; "Place order" button disabled when empty; copy "Pay at the counter when you collect."
  Empty state: "Your order is empty" with a link to the menu.
  Placing calls `orders.place(cart.read(), store.id)` then `cart.clear()`.
- **Status** (active order): steps Received, Being made, Ready for pickup with the current one highlighted; the pickup code large when `ready`; the lines and total; "I've picked it up" when `ready` (sets `collected`); "Cancel order" while `received` only (sets `cancelled`).
  When the status becomes `collected` or `cancelled` the page returns to the cart state and the order appears in History.

### 5.3 History (`/history`)

- `pastOrders` newest first.
  Each: date and time (`Intl.DateTimeFormat('en-AU')`), status pill (Collected or Cancelled), line summary ("2 × Signature Milk Tea, 1 × Matcha Latte"), total, "Order again".
- "Order again" calls `cart.replace(order.lines)` and navigates to `/order`.
- Empty state: "No orders yet" with a link to the menu.

### 5.4 Account (`/account`)

- Profile form: display name (required), email (optional, validated), phone (optional), marketing opt in checkbox, Save.
  Saves through `account.save`, shows "Saved" in a live region.
  Validation errors are shown inline under the field with `aria-describedby`.
- Store card: name, address lines, phone as a `tel:` link, today's hours from `/store` (reusing `openingStatus`).
- "Clear my data": confirmation step ("This removes your cart, orders and profile from this device"), then clears all three stores.

## 6. Files

```
packages/shared/src/order.ts, account.ts           (+ tests)
webapp/src/store/{types,local,orders,hooks,orderProgress}.ts, StoresProvider.tsx (+ tests)
webapp/src/router.tsx, main.tsx (router + progress start)
webapp/src/components/layout/{AppShell,TabBar}.tsx (+ css, tests)
webapp/src/components/order/{CartLineRow,OrderStatusSteps}.tsx (+ css, tests)
webapp/src/pages/{OrderPage,HistoryPage,AccountPage,NotFoundPage}.tsx (+ css, tests)
webapp/src/components/menu/DrinkCard.tsx (Add button), HomePage.tsx (live region)
webapp/knowledge/{orders,navigation}.md, INDEX.md, home-screen.md, CLAUDE.md updates
knowledge/decisions/0009-local-first-orders-with-shared-contract.md
```

## 7. Testing

- Shared: schema tests for every shape, including the total refinement and the pickup code format.
- Store: `createLocalStores` against an in memory `Storage` fake: merge on add, quantity 0 removes, corrupt JSON resets, subscribers fire, `place` produces a valid `Order` with a matching total and a four character code.
- Order progress: fake timers; an order placed 25 seconds ago becomes `making` immediately and `ready` 35 seconds later; stop cancels timers.
- Pages: rendered under `MemoryRouter` with a `StoresProvider` holding in memory stores and mocked API; cart flow, place, status view, collect, history reorder, account save and validation, clear data.
- TabBar: active tab per route, badge count, dot when active order.
- Theme guard and responsive checklist for every new component.
- End to end on `pnpm dev`: add drinks, place, watch progression, collect, reorder from History, save profile, clear data.

## 8. Out of scope

Payments, sign in, API persistence of orders and accounts, drink customisation, notifications, editing a placed order.
