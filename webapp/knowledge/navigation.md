# Navigation

## Moving between tabs

The tab links carry React Router's `viewTransition`, so each tab change runs inside `document.startViewTransition`.
`src/styles.css` animates the page: the old page slides out to the left while the new one slides in from the right, over `--motion-slow`.
The tab bar and the desktop order panel have their own `view-transition-name`, so they hold still while the page moves.
Browsers without view transitions cut as before, and reduced motion turns the animation off.

## Routes

`src/router.tsx` exports `routes` (for tests) and `createAppRouter()` (for `main.tsx`).
One layout route renders `AppShell`; its children are the pages.

| Path       | Page           | Purpose                                                                       |
| ---------- | -------------- | ----------------------------------------------------------------------------- |
| `/`        | `HomePage`     | Greeting and search, Your usual, Popular now. The only page with `AppHeader`. |
| `/menu`    | `MenuPage`     | The full catalogue with search (`?q=`) and category chips.                    |
| `/order`   | `OrderPage`    | Cart, then live status.                                                       |
| `/history` | `HistoryPage`  | Past orders and reorder.                                                      |
| `/account` | `AccountPage`  | Profile, store card, clear data.                                              |
| `*`        | `NotFoundPage` | A link home.                                                                  |

React Router runs in declarative mode.
Vercel's SPA rewrite in `vercel.json` serves `index.html` for every path, so deep links work.

## AppShell

`components/layout/AppShell.tsx` renders the hidden document `h1`, `<main class="app">` with the `Outlet`, the iOS shell note, the desktop order panel, and `TabBar`.
`.app` in `styles.css` owns the gutters and leaves room for the fixed pieces: bottom padding of `--tab-bar-height` plus the safe area on phones; from 1024px a left margin of `--sidebar-width`, a right margin of `--cart-panel-width`, and the page in one centred column of at most 60rem, so a wide screen widens the gutters rather than stretching the cards.
The three layout tokens live in `tokens.css`.

## Desktop layout (1024px and up)

Three columns: the sidebar (left, 340px), the page (middle, fluid), and the order panel (right, 340px), so the page sits centred between two equal columns.

- The order panel (`<aside class="orderpanel">`, `AppShell.css`) is fixed, full height, scrolls on its own, and renders `OrderPanel` in compact mode.
  It is always present, empty or not, so the layout never shifts.
- Because the panel is always visible, the sidebar hides the Order tab (`.tab--order`) and `/order` redirects to `/` via `useMediaQuery(DESKTOP_QUERY)` in `OrderPage`.
  Phones keep the tab and the page.
- Order, History and Account content columns centre themselves at 44rem inside the middle column.
- The drink grid uses `repeat(auto-fill, minmax(300px, 1fr))` from 768px, so it shows as many cards as the middle column fits without a width-specific breakpoint.

`useMediaQuery` (`lib/useMediaQuery.ts`) wraps `matchMedia` in `useSyncExternalStore` and is false where `matchMedia` does not exist (tests), so components default to the phone layout.

## TabBar

`components/layout/TabBar.tsx`, one component, two shapes:

- Below 1024px: fixed to the bottom, five equal columns (Home, Menu, Order, History, Account), icons over labels, `--shadow-raised`, safe area padding at the bottom.
- From 1024px: fixed to the left as a sidebar whose width is `--sidebar-width`, defined as `var(--cart-panel-width)` so the two side columns always match. The full logo lockup sits at the top and the tabs are 52px icon plus label rows at 1.0625rem.

`NavLink` supplies `aria-current="page"`; the active tab is accent text on phones and a white bordered row with accent text in the sidebar.
The sidebar ends with the pickup card from the mockup (store name, today's hours, a Store details link to `/account`), fed by `useStoreInfo()` from the shared catalogue through `AppShell`.
The Order tab shows the cart line count as a badge, or a dot while an order is active.
Both states also have visually hidden text so the link name reads "Order, 2 in your cart" or "Order, order in progress".

## Adding a page

1. Create `pages/NamePage.tsx` with its own `.css`, a heading that labels the section, and a test under `MemoryRouter` plus `StoresProvider`.
2. Add the route in `router.tsx`.
3. Add a tab only if the page is a top level destination; otherwise link to it from an existing page.
4. Update this document and `INDEX.md`.
