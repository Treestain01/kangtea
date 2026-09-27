# Orders

## Where the data lives

Cart, orders, the signed in session and device preferences live in the browser's `localStorage` behind four stores in `src/store/`.
Nothing about orders touches the API yet.
The shapes are the shared contract's `OrderLine`, `Order` and `AuthSession`, so moving cart and orders to the API later changes `src/store/local.ts` and `src/store/orderProgress.ts` and nothing else.

| Piece           | File                                         | Role                                                                                                                            |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Interfaces      | `store/types.ts`                             | `CartStore`, `OrdersStore`, `SessionStore`, `PreferencesStore`, `Stores`. Pages depend on these, never on storage.              |
| Preferences     | `store/preferences.ts`                       | `PreferencesSchema` (`theme`: system, light or dark) and the defaults. Device level, not part of the shared contract.           |
| Implementation  | `store/local.ts`                             | `createLocalStores(storage)`. One key per store, schema validated on every read, corrupt data resets.                           |
| Derived helpers | `store/orders.ts`                            | `activeOrder`, `pastOrders`, `cartTotalCents`, `summariseLines`, `countDrinks`.                                                 |
| React access    | `store/StoresProvider.tsx`, `store/hooks.ts` | `useStores()` for actions, `useCart()`, `useOrders()`, `useSession()`, `usePreferences()` for reads via `useSyncExternalStore`. |
| Test helpers    | `store/testing.ts`                           | `createMemoryStorage`, `createTestStores`, `menuItemFixture`.                                                                   |

Storage keys are `kangtea.cart`, `kangtea.orders`, `kangtea.session`, `kangtea.preferences`.

## Lines and customisations

`store/lines.ts` owns how a customised drink becomes a line:

- `buildCartLine(item, selection)` sets `unitPriceCents` to the drink price plus its toppings and records the choices as `customisations`: `{ name: 'Sugar', value: '50%' }`, `{ name: 'Ice', value: 'Less ice' }`, one `{ name: 'Topping', value }` per topping.
- `lineKey(line)` identifies a line by drink plus exactly its customisations. Two lines merge in the cart only when their keys match; `setQuantity` and remove address lines by key. A line with no customisations has its `itemId` as its key.
- `summariseCustomisations(line)` renders "50% · Less ice · Pearls, Pudding" for cart rows, the order recap and History.

Because names and prices are snapshots, a topping price change later does not alter a placed order.

## Lifecycle

```
cart.add(item)  ->  lines in the cart
orders.place(lines, storeId)  ->  Order { status: received }  and the cart is cleared
received -> making -> ready         (simulated kitchen, see below)
ready -> collected                  (customer taps "I've picked it up")
received -> cancelled               (customer taps "Cancel order"; only while received)
```

At most one order is active (`received`, `making` or `ready`) at a time; `activeOrder` returns it.
`pastOrders` is everything `collected` or `cancelled`, newest first.
`OrderLine` snapshots the name and unit price, so History stays right when the menu changes.
`totalCents` is validated against the lines by the schema on every write and read.

## The simulated kitchen

`src/store/orderProgress.ts` is the one fake behaviour in the product.
`startOrderProgress(orders)` runs once from `main.tsx`.
It advances the active order to `making` 20 seconds after `placedAt` and to `ready` at 60 seconds, measured from `placedAt` so a reload resumes correctly.
It never collects; that is the customer's action.
When the API owns orders, replace this file with polling (or a push) and delete nothing else.

## Pages

- `components/order/OrderPanel.tsx`: the cart while no order is active, the status view while one is. Placing needs the store id from `/store`, so the button stays disabled until that loads. `compact` stacks every line as a plain hairline-separated row for the narrow desktop panel and swaps the "Browse the menu" link for a hint.
- `/order` (`pages/OrderPage.tsx`): renders `OrderPanel` on phones. On desktop the same panel is always on the right of every page, so the route redirects to `/`.
- `/history` (`pages/HistoryPage.tsx`): `pastOrders` with date, status pill, `summariseLines`, total, and "Order again" which calls `cart.replace(order.lines)` and navigates to `/order`.
- `/account` (`pages/AccountPage.tsx`): see `accounts.md`. Clearing empties cart and orders and signs out; the theme choice stays.

## Rules

- Pages call the stores through `useStores()`; nothing outside `store/` reads `localStorage`.
- Every write goes through a store method so the schema validation and subscriber notification always run.
- Money stays in integer cents everywhere; `lib/money.ts` formats it once, at render.
- A control that cannot do anything yet is not rendered. The Add button appeared with the cart, not before.
