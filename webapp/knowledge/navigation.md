# Navigation

## Routes

`src/router.tsx` exports `routes` (for tests) and `createAppRouter()` (for `main.tsx`).
One layout route renders `AppShell`; its children are the pages.

| Path       | Page           | Purpose                                               |
| ---------- | -------------- | ----------------------------------------------------- |
| `/`        | `HomePage`     | Menu and add to cart. The only page with `AppHeader`. |
| `/order`   | `OrderPage`    | Cart, then live status.                               |
| `/history` | `HistoryPage`  | Past orders and reorder.                              |
| `/account` | `AccountPage`  | Profile, store card, clear data.                      |
| `*`        | `NotFoundPage` | A link home.                                          |

React Router runs in declarative mode.
Vercel's SPA rewrite in `vercel.json` serves `index.html` for every path, so deep links work.

## AppShell

`components/layout/AppShell.tsx` renders the hidden document `h1`, `<main class="app">` with the `Outlet`, the iOS shell note, the desktop order panel, and `TabBar`.
`.app` in `styles.css` owns the gutters and leaves room for the fixed pieces: bottom padding of `--tab-bar-height` plus the safe area on phones; from 1024px a left margin of `--sidebar-width`, a right margin of `--cart-panel-width`, and no max width, so the page fills the middle column.
The three layout tokens live in `tokens.css`.

## Desktop layout (1024px and up)

Three columns: the sidebar (left, 340px), the page (middle, fluid), and the order panel (right, 340px), so the page sits centred between two equal columns.

- The order panel (`<aside class="orderpanel">`, `AppShell.css`) is fixed, full height, scrolls on its own, and renders `OrderPanel` in compact mode.
  It is always present, empty or not, so the layout never shifts.
- Because the panel is always visible, the sidebar hides the Order tab (`.tab--order`) and `/order` redirects to `/` via `useMediaQuery(DESKTOP_QUERY)` in `OrderPage`.
  Phones keep the tab and the page.
- Order, History and Account content columns centre themselves at 44rem inside the middle column.
- The drink grid uses `repeat(auto-fill, minmax(200px, 1fr))` from 768px, so it shows as many cards as the middle column fits without a width-specific breakpoint.

`useMediaQuery` (`lib/useMediaQuery.ts`) wraps `matchMedia` in `useSyncExternalStore` and is false where `matchMedia` does not exist (tests), so components default to the phone layout.

## TabBar

`components/layout/TabBar.tsx`, one component, two shapes:

- Below 1024px: fixed to the bottom, four equal columns, icons over labels, `--shadow-raised`, safe area padding at the bottom.
- From 1024px: fixed to the left as a 340px sidebar (`--sidebar-width`, equal to `--cart-panel-width`) with the full logo lockup at the top and 60px icon plus label rows at 1.25rem.

`NavLink` supplies `aria-current="page"`; the active tab is `--shadow-inset` with accent text, matching chips.
The Order tab shows the cart line count as a badge, or a dot while an order is active.
Both states also have visually hidden text so the link name reads "Order, 2 in your cart" or "Order, order in progress".

## Adding a page

1. Create `pages/NamePage.tsx` with its own `.css`, a heading that labels the section, and a test under `MemoryRouter` plus `StoresProvider`.
2. Add the route in `router.tsx`.
3. Add a tab only if the page is a top level destination; otherwise link to it from an existing page.
4. Update this document and `INDEX.md`.
