# Home Screen and Menu

The `/` route is a landing screen; the `/menu` route is the full catalogue.
Both read the store and menu through `src/api/useCatalogue.ts`, which loads the two endpoints together and exposes `loading`, `error` (with `retry`) and `ready`.

## Home (`pages/HomePage.tsx`)

Top to bottom, following the design mockup:

1. `AppHeader` with the time of day greeting, "Pick up at Calamvale Central · Open until 8:00 pm", and the `SearchBar` in its `actions` slot (beside the greeting from 768px, below it on phones).
   On phones the header also shows a small brand row (mark plus KANGTEA); on desktop the sidebar carries the logo so the row is hidden.
2. `CategoryChips` under the search, as in the mockup. On Home nothing is selected; tapping a chip navigates to `/menu?category=<id>`, which the menu page reads as its initial category.
3. `UsualCard`: the most recent collected order as "Your usual", with the first drink's name, its customisation summary, the drink's cup illustration (when the menu still has that drink), and "Reorder · $X" which calls `cart.replace(order.lines)` and navigates to `/order`.
   Hidden until a collected order exists; it never shows placeholder content.
4. `PopularRow`: "Popular now" with a "See the full menu" link to `/menu`.
   Items come from `lib/popular.ts#popularItems`: best sellers first, then new, topped up in menu order to four.
   A swipeable row of compact `DrinkCard`s (148px wide, 96px art) on phones, a single row of four (120px art) from 768px.
5. `CustomiseDrinkDialog` and the visually hidden `role="status"` announcement, as on the menu page.

The mockup's pearl loyalty card is the one element not carried over; it needs a points data source first.

Submitting the search navigates to `/menu?q=<text>`.

## Menu (`pages/MenuPage.tsx`)

- Heading, a controlled `SearchBar` bound to the `q` query parameter (`useSearchParams`, replaced as you type), `CategoryChips` (initial selection from the `category` parameter), and the large `DrinkGrid`.
- Filtering combines the selected category with `lib/popular.ts#matchesQuery` (case-insensitive on name and description).
- Empty search result: "No drinks match “…”" with a Clear search button.
- Tapping a card opens the customise sheet; adding announces "Added {name}".

## Components

| Component         | Path                                  | Owns                                                                                                                                                                                     |
| ----------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppHeader`       | `components/layout/AppHeader.tsx`     | Brand row (phones), greeting, store line, `actions` slot.                                                                                                                                |
| `SearchBar`       | `components/home/SearchBar.tsx`       | Pressed-in search field. Uncontrolled with `onSubmit` on Home, controlled with `value`/`onChange` on Menu.                                                                               |
| `UsualCard`       | `components/home/UsualCard.tsx`       | The one accent filled card on Home.                                                                                                                                                      |
| `PopularRow`      | `components/home/PopularRow.tsx`      | Section heading with link, swipe row or grid of compact cards.                                                                                                                           |
| `CategoryChips`   | `components/menu/CategoryChips.tsx`   | "All" plus categories sorted by `sortOrder`, as `aria-pressed` buttons.                                                                                                                  |
| `DrinkGrid`       | `components/menu/DrinkGrid.tsx`       | 2 columns on phones; from 768px as many 300px cards as fit.                                                                                                                              |
| `DrinkCard`       | `components/menu/DrinkCard.tsx`       | Name, optional description, price, first tag, `CupIllustration`. `variant="compact"` for the home row: square art, no description. The whole card is a button when `onOpen` is provided. |
| `CupIllustration` | `components/menu/CupIllustration.tsx` | Decorative CSS cup tinted with the item's `colour`.                                                                                                                                      |

## Customising and adding to the cart

The card opens `components/menu/CustomiseDrinkDialog.tsx`, a native `<dialog>` bottom sheet with the drink hero pinned at the top, sugar and ice tracks and topping tiles scrolling in the middle, and the itemised summary with the add button pinned at the bottom.
Adding builds an `OrderLine` with `store/lines.ts#buildCartLine`, calls `cart.add`, closes the sheet, and announces the addition.
The option lists are placeholders in `api/src/data/menu.ts` until Kang Tea confirms them.

## Layout rules in play

- `.app` provides the only side gutters and caps content at 72rem on tablets; on desktop it fills the middle column.
- Every colour is a token; drink tints arrive as data through the `--tea` custom property.
- Display type (`--font-display`, Fraunces) is used for the greeting, drink names, prices and headings; body type is Nunito Sans.

## Deliberately absent

- Loyalty stamps and sizes: each needs a data source or a menu change first.
