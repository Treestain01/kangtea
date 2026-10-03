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

- `buildCartLine(item, selection)` sets `unitPriceCents` to the drink price plus every lot of every topping and records the choices as `customisations`: `{ name: 'Sugar', value: '50%' }`, `{ name: 'Ice', value: 'Less ice' }`, one `{ name: 'Topping', value }` per topping, with `quantity` set when there is more than one lot (`{ name: 'Topping', value: 'Pearls', quantity: 2 }`).
- A topping can be added up to `MAX_TOPPING_QUANTITY` (3) times. The cap is a placeholder until Kang Tea confirms it; the customise sheet enforces it, the contract only requires a positive integer.
- `lineKey(line)` identifies a line by drink plus exactly its customisations and their quantities, so one lot of pearls and two lots are different lines. Two lines merge in the cart only when their keys match; `setQuantity` and remove address lines by key. A line with no customisations has its `itemId` as its key.
- `describeCustomisation(choice)` renders "Pearls" or "Pearls ×2"; `summariseCustomisations(line)` joins them as "50% · Less ice · Pearls ×2, Pudding" for cart rows, the order recap and History.

Because names and prices are snapshots, a topping price change later does not alter a placed order.

## The free drink

When a signed in person has a finished pearl card (`card.available` above zero), the cart shows "Free drink · <first drink>" and the total drops by that drink's menu price, toppings still charged (ADR 0023).
Placing the order redeems on the server first, then calls `orders.place(lines, storeId, now, freeDrink)`, which records `freeDrink` (line index and cents) on the order and sets the total through `orderTotalCents`.
If redeeming fails the order is placed at full price and a notice says the free drink stays on the card.
The active order and History show the free drink line; stamping on collect skips it.

## The order panel in motion

- Adding from the customise sheet flies a clone of the built cup into the Order tab (`components/cup/fly.ts#flyCup`); the tab badge is keyed on the count so it bumps on every change.
  On desktop the flight lands on the order panel instead; whichever element carrying `data-fly-target` is on screen is the target.
- Every cart row and recap line shows a `components/cup/StaticCup.tsx` drawn from the line's customisations and the menu item's colour and pearls, found through the catalogue; a retired drink shows without one.
- While an order is active the panel shows a kitchen cup of the first line: empty while received, poured with its pieces dropping in while being made, lidded when ready.
  A ring around it fills toward ready on the kitchen schedule from `config.ts`, with "Ready in m:ss" beneath (`formatCountdown`), refreshed four times a second until ready.
- Totals in the panel are `components/ui/RollingPrice.tsx`: the real digits stay in the DOM and a CSS strip behind each digit rolls to it when the total changes.
- History draws each past order's drinks as cups, three at most and then a count, from the catalogue's colours; Order again pours them (`usePour`) and flies them into the order before the cart is replaced.
- An empty order shows an empty cup outline (`StaticCup` at level 0) above the copy, as does an empty History. Loading states use `components/cup/Loading.tsx`, a cup pouring itself on a loop. The not found page is a tipped cup with a puddle.
- The kitchen's sounds and the ready haptic fire once from `AppShell`, which also posts the order's status to the iOS shell, so a mounted but hidden panel never doubles them.
- Collecting fires a haptic tap where available, posts the stamps, drops a pearl from the kitchen cup onto the pearl strip and then marks the order collected.
  Without motion, or with nothing to land on, collecting is immediate.
- `fly.ts` flights resolve at once under reduced motion, in browsers without the Web Animations API and when no target is visible; nothing in the order flow waits on decoration.

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
The timings come from `src/config.ts#KITCHEN_SCHEDULE`, read from `VITE_KITCHEN_MAKING_SECONDS` and `VITE_KITCHEN_READY_SECONDS`; for development put small numbers in `webapp/.env.local` (git ignored, Vite restarts when it changes). Ready never comes before making.
It never collects; that is the customer's action.
When the API owns orders, replace this file with polling (or a push) and delete nothing else.

## Pages

- `components/order/OrderPanel.tsx`: the cart while no order is active, the status view while one is. Placing needs the store id from the shared catalogue (`useStoreInfo()`), so the button stays disabled until that loads. `compact` stacks every line as a plain hairline-separated row for the narrow desktop panel and swaps the "Browse the menu" link for a hint.
- `/order` (`pages/OrderPage.tsx`): renders `OrderPanel` on phones. On desktop the same panel is always on the right of every page, so the route redirects to `/`.
- `/history` (`pages/HistoryPage.tsx`): `pastOrders` with date, status pill, `summariseLines`, total, and "Order again" which calls `cart.replace(order.lines)` and navigates to `/order`.
- `/account` (`pages/AccountPage.tsx`): see `accounts.md`. Clearing empties cart and orders and signs out; the theme choice stays.

## Rules

- Pages call the stores through `useStores()`; nothing outside `store/` reads `localStorage`.
- Every write goes through a store method so the schema validation and subscriber notification always run.
- Money stays in integer cents everywhere; `lib/money.ts` formats it once, at render.
- A control that cannot do anything yet is not rendered. The Add button appeared with the cart, not before.
