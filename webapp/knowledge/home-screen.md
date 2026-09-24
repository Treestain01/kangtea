# Home Screen

The `/` route.
`src/pages/HomePage.tsx` composes it from three components and owns its catalogue state; the cart lives in the store layer (see `orders.md`).

## Data flow

1. On mount, `HomePage` calls `fetchStore()` and `fetchMenu()` together (`Promise.all`).
2. While waiting it renders `AppHeader` with `store={null}` and a `role="status"` line "Loading the menu".
3. On failure it renders a `role="alert"` message with a "Try again" button that re-runs the effect by bumping an attempt counter.
4. On success it renders the header with the store, the `CategoryChips` filter, and the `DrinkGrid` for the selected category (`null` means all).

Nothing is cached yet.
A refresh refetches both endpoints.

## Components

| Component         | Path                                  | Owns                                                                                                                                                          |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppHeader`       | `components/layout/AppHeader.tsx`     | Logo, time of day greeting from the visitor's clock, "Pick up at Calamvale Central · Open until 8:00 pm" from `lib/openingHours.ts` in the store's time zone. |
| `CategoryChips`   | `components/menu/CategoryChips.tsx`   | "All" plus categories sorted by `sortOrder`, as `aria-pressed` buttons. Scrolls horizontally on phones, wraps from 768px.                                     |
| `DrinkGrid`       | `components/menu/DrinkGrid.tsx`       | A list of `DrinkCard`. 2 columns on phones; from 768px as many 300px cards as fit. Empty state text when a category has no drinks.                            |
| `DrinkCard`       | `components/menu/DrinkCard.tsx`       | Name, optional description, price via `lib/money.ts`, first tag as a pill, and a `CupIllustration`.                                                           |
| `CupIllustration` | `components/menu/CupIllustration.tsx` | Decorative CSS cup tinted with the item's `colour`, pearls when `pearls` is true. `aria-hidden`.                                                              |

## Customising and adding to the cart

The whole `DrinkCard` is a button (`aria-label="Customise {name}"`, an invisible cover over the card) when `onOpen` is provided.
It opens `components/menu/CustomiseDrinkDialog.tsx`: a native `<dialog>` shown as a bottom sheet on phones and a centred card from 768px.
Inside are three groups from `menu.customisations` (sugar and ice as radio chips, toppings as a priced checklist), a quantity stepper, and one button whose label carries the live total, for example "Add to order · $9.30".
Adding builds an `OrderLine` with `store/lines.ts#buildCartLine` (toppings folded into `unitPriceCents`, choices recorded as `customisations`), calls `cart.add`, closes the dialog, and announces "Added {name}" in a visually hidden `role="status"` region for two seconds.
The Order tab's badge updates at once because it reads the same store.

The option lists are placeholders in `api/src/data/menu.ts` until Kang Tea confirms its sugar and ice levels, toppings and topping prices.

## Deliberately absent

- Search, the reorder card, loyalty stamps: each needs accounts or search behaviour first.
- Sizes: the dialog offers sugar, ice and toppings; a size group would join `menu.customisations` the same way.

## Layout rules in play

- `.app` provides the only side gutters (`--space-4` on phones, `--space-6` from 768px) and caps content at 72rem.
- Every colour in these components is a token; drink tints arrive as data and are applied through the `--tea` custom property on the cup.
- Chips and the retry button are `--tap-target` (44px) tall.

## Copy

The greeting uses the visitor's local hour (morning before 12, afternoon before 17, evening after).
The opening line uses the store's time zone so it is right for a visitor in another state.
Prices are formatted with `Intl.NumberFormat('en-AU')`, so `750` cents renders as `$7.50`.
