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

`components/layout/AppShell.tsx` renders the hidden document `h1`, `<main class="app">` with the `Outlet`, the iOS shell note, and `TabBar`.
`.app` in `styles.css` owns the gutters and leaves room for the tab bar: bottom padding of `--tab-bar-height` plus the safe area on phones, a left margin of `--sidebar-width` from 1024px.
Both layout tokens live in `tokens.css`.

## TabBar

`components/layout/TabBar.tsx`, one component, two shapes:

- Below 1024px: fixed to the bottom, four equal columns, icons over labels, `--shadow-raised`, safe area padding at the bottom.
- From 1024px: fixed to the left as a 220px sidebar with the logo mark at the top and icon plus label rows.

`NavLink` supplies `aria-current="page"`; the active tab is `--shadow-inset` with accent text, matching chips.
The Order tab shows the cart line count as a badge, or a dot while an order is active.
Both states also have visually hidden text so the link name reads "Order, 2 in your cart" or "Order, order in progress".

## Adding a page

1. Create `pages/NamePage.tsx` with its own `.css`, a heading that labels the section, and a test under `MemoryRouter` plus `StoresProvider`.
2. Add the route in `router.tsx`.
3. Add a tab only if the page is a top level destination; otherwise link to it from an existing page.
4. Update this document and `INDEX.md`.
