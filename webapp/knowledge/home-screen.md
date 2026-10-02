# Home Screen and Menu

The `/` route is a landing screen; the `/menu` route is the full catalogue.
Both read the store and menu through `useCatalogue()`, backed by `src/api/CatalogueProvider.tsx`, which loads the two endpoints once for the whole app, caches them for the tab, and exposes `loading`, `error` (with `retry`) and `ready` (see `api-client.md`).

## Home (`pages/HomePage.tsx`)

Top to bottom, following the design mockup:

1. `AppHeader` with the time of day greeting, "Pick up at Calamvale Central · Open until 8:00 pm", and the `SearchBar` in its `actions` slot (beside the greeting from 768px, below it on phones).
   On phones the header also shows a small brand row (mark plus KANGTEA); on desktop the sidebar carries the logo so the row is hidden.
2. `CategoryChips` under the search, as in the mockup. On Home nothing is selected; tapping a chip navigates to `/menu?category=<id>`, which the menu page reads as its initial category.
3. `UsualCard`: the most recent collected order as "Your usual", with the first drink's name, its customisation summary, the drink's cup illustration (when the menu still has that drink), and "Reorder · $X" which calls `cart.replace(order.lines)` and navigates to `/order`.
   Hidden until a collected order exists; it never shows placeholder content.
4. `LoyaltyCard`: the pearl card, an invitation to sign in when signed out, the stamps and free drink when signed in (see `loyalty.md`).
5. `PopularRow`: "Popular now" with a "See the full menu" link to `/menu`.
   Items come from `lib/popular.ts#popularItems`: best sellers first, then new, topped up in menu order to four.
   A two column grid of compact `DrinkCard`s (96px art) on phones, a single row of four (120px art) from 768px.
6. `CustomiseDrinkDialog` and the visually hidden `role="status"` announcement, as on the menu page.

Submitting the search navigates to `/menu?q=<text>`.

## Menu (`pages/MenuPage.tsx`)

- Heading, a controlled `SearchBar` bound to the `q` query parameter (`useSearchParams`, replaced as you type), `CategoryChips` (initial selection from the `category` parameter), and the large `DrinkGrid`.
- Filtering combines the selected category with `lib/popular.ts#matchesQuery` (case-insensitive on name and description).
- Empty search result: "No drinks match “…”" with a Clear search button.
- Tapping a card opens the customise sheet; adding announces "Added {name}".

## Components

| Component       | Path                                | Owns                                                                                                                                                                                           |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppHeader`     | `components/layout/AppHeader.tsx`   | Brand row (phones), greeting, store line, `actions` slot.                                                                                                                                      |
| `SearchBar`     | `components/home/SearchBar.tsx`     | Pressed-in search field. Uncontrolled with `onSubmit` on Home, controlled with `value`/`onChange` on Menu.                                                                                     |
| `UsualCard`     | `components/home/UsualCard.tsx`     | The one accent filled card on Home.                                                                                                                                                            |
| `PopularRow`    | `components/home/PopularRow.tsx`    | Section heading with link, two column grid of compact cards on phones, four across from 768px.                                                                                                 |
| `CategoryChips` | `components/menu/CategoryChips.tsx` | "All" plus categories sorted by `sortOrder`, as `aria-pressed` buttons.                                                                                                                        |
| `DrinkGrid`     | `components/menu/DrinkGrid.tsx`     | 2 columns on phones; from 768px as many 300px cards as fit.                                                                                                                                    |
| `DrinkCard`     | `components/menu/DrinkCard.tsx`     | Name, optional description, price, first tag, the drink's `StaticCup`. `variant="compact"` for the home row: square art, no description. The whole card is a button when `onOpen` is provided. |
| `StaticCup`     | `components/cup/StaticCup.tsx`      | The cup at rest, drawn from a colour and a line's choices: menu cards, Your usual, cart rows, the kitchen cup. The card's cup leans toward the pointer.                                        |
| `SurpriseCard`  | `components/menu/SurpriseCard.tsx`  | "Can't decide?" on the Menu page: tap, or shake a phone, and the cards light up in turn until one is picked with a random sugar and ice; the customise sheet opens on it to confirm.           |
| `LiveCup`       | `components/cup/LiveCup.tsx`        | The cup in the customise sheet that builds itself from the current choices, with physics for toppings and ice.                                                                                 |
| `ToppingArt`    | `components/cup/ToppingArt.tsx`     | A topping drawn with its cup symbol, for the tokens in the customise sheet's tray.                                                                                                             |

## Cup of the day

`components/home/CupOfTheDay.tsx` sits under the category chips: one drink from the board that pours itself about half a second after Home appears, with "Build it" opening the customise sheet on it and "Pour again" replaying the pour.
`lib/popular.ts#drinkOfTheDay` picks it: the recommended drinks in turn, one per local day, falling back to best sellers and then the whole menu.
The pour itself is `components/cup/usePour.ts`, shared with Your usual and History: empty, filling with the pieces dropping, lidded, then the handover; immediate where nothing can animate.

## Your usual

`components/home/UsualCard.tsx` shows the most recent collected order with a `StaticCup` of its first drink drawn from the saved choices.
Re-pour empties that cup, fills it with the pieces dropping in, puts the lid on, flies it into the order and only then replaces the cart and opens the Order page.
Under reduced motion, or where nothing can animate, the reorder is immediate.

## The Menu page

Search, category chips and the drink grid, every drink drawn as its cup.
Choosing a category washes the top of the page with that family's colour, taken from the first drink in it, through the registered `--wash` property in `MenuPage.css` so the change fades.
`SurpriseCard` sits under the grid; its pick opens `CustomiseDrinkDialog` with `initial` levels so the person confirms rather than getting a surprise in the cart.

### Sharing a drink

The customise sheet's share button turns the current build into a link on this origin, `/menu?build=<item>~<sugar>~<ice>~<topping>.<lots>,...` (`lib/build.ts`), and offers it through the device share sheet with a PNG card of the cup when the sheet accepts files (`lib/share.ts`, `lib/cupImage.ts`).
Without a share sheet the link is copied; the outcome is read out in the sheet's readout line and to assistive technology.
Opening a build link on the Menu page decodes it against the menu, opens the sheet pre-built with those levels and toppings, and removes the parameter from the address.
Unknown drinks are ignored, unknown levels fall back to the defaults, unknown toppings are dropped and lots are capped at three.
The PNG is drawn on a canvas from a standalone copy of the cup's svg with the sprite symbols and the cup's CSS variables inlined, on the page's accent colour; where that cannot be drawn the share goes ahead without a picture.

## Customising and adding to the cart

The card opens `components/menu/CustomiseDrinkDialog.tsx`, a native `<dialog>` bottom sheet built around the live cup (ADR 0020).
A compact head carries the name, Chinese name, category and price; the stage below it puts a vertical sugar dial on the left, the cup filling the middle, and a vertical ice dial on the right; a swipeable tray of topping tokens sits under the cup; a one line readout and the add button with the live total are pinned at the bottom.
The dials are radio groups with the highest level at the top; a topping token adds a lot per tap, shows a count badge and a minus to take one away, and is drawn with `components/cup/ToppingArt.tsx` from the same symbol the cup drops in.
The tray shows an arrow at whichever edge still has tokens beyond it (`TrayScroller`), tapping it scrolls a page, and the live cup casts `--shadow-object`.
The cup is `components/cup/LiveCup.tsx`: the tea deepens with sugar, ice floats under the surface, foam and brulee fade in on top, and every other topping drops in under a small physics world and piles at the bottom.
Nothing in the sheet scrolls on a phone; the cup is sized to the height the dials and tray leave.
`components/cup/cupParts.ts` maps menu names to art and `components/cup/cupPhysics.ts` wraps Matter.js, which loads only when the sheet opens; the rules are in `src/assets/art/README.md` and ADR 0018.
Adding builds an `OrderLine` with `store/lines.ts#buildCartLine`, calls `cart.add`, closes the sheet, and announces the addition.
The option lists come from `seed.json` at the repository root, transcribed from the in-store board: sugar 0, 30, 50, 70 and 100%; warm, no ice, less ice and normal ice.

## Layout rules in play

- `.app` provides the only side gutters and caps content at 72rem on tablets; on desktop it fills the middle column.
- Every colour is a token; drink tints arrive as data through the `--tea` custom property.
- Display type (`--font-display`, Fraunces) is used for the greeting, drink names, prices and headings; body type is Nunito Sans.

## The cup art

`src/assets/art/cup-parts.svg` holds the SVG part library for the live cup in the customise sheet and for the pearl loyalty card.
The README beside it lists every part, its tint variable and how each choice maps onto the cup; the Cup Lab artifact linked there is the interactive reference.
`components/cup/CupSprite.tsx` puts the library into the document once, from `AppShell`, because the live cup and the loyalty stamps both draw from it.

## Deliberately absent

- Sizes: they need a menu change first.
