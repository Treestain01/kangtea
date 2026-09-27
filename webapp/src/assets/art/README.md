# Cup art

`cup-parts.svg` is the part library for the live cup in the customise sheet and for the pearl loyalty card.
Everything is vector so it tints from the drink colour and the theme tokens and can animate.
Compose parts with `<use href="#kt-...">`; nothing here is a finished picture.

## Parts

| Symbol               | Space     | Use                                                               |
| -------------------- | --------- | ----------------------------------------------------------------- |
| `kt-cup-body`        | 120 x 200 | Translucent cup wall with one highlight stroke.                   |
| `kt-cup-lid`         | 120 x 200 | Dome lid and rim.                                                 |
| `kt-straw`           | 120 x 200 | Straw at 8 degrees, coloured `--straw`.                           |
| `kt-tea-sheen`       | 120 x 200 | Gradient laid over the liquid so any tea colour reads as a drink. |
| `kt-steam`           | 120 x 200 | Two wisps above the lid, for the Warm ice level.                  |
| `kt-ice-cube`        | 24 x 24   | One cube. Place two for Less ice, four for Normal ice.            |
| `kt-pearl`           | 24 x 24   | Boba. Sinks to the bottom rows.                                   |
| `kt-pearl-mini`      | 24 x 24   | Mini pearl. Sinks.                                                |
| `kt-taro-ball`       | 24 x 24   | Mini taro ball. Sinks.                                            |
| `kt-agar-ball`       | 24 x 24   | Agar ball. Sinks, translucent.                                    |
| `kt-jelly-cube`      | 24 x 24   | Grass, coconut or tea jelly. Floats mid cup, tinted by `--jelly`. |
| `kt-popping-ball`    | 24 x 24   | Water chestnut or barley popping ball. Floats.                    |
| `kt-foam-cap`        | 120 x 60  | Milk foam on the surface.                                         |
| `kt-ice-cream-scoop` | 120 x 60  | Vanilla ice cream on the surface.                                 |
| `kt-brulee`          | 120 x 60  | Brulee crust on the surface.                                      |
| `kt-pudding`         | 24 x 24   | Pudding. Sits just under the surface.                             |
| `kt-stamp-empty`     | 40 x 40   | Loyalty card: a cup still to earn, dashed.                        |
| `kt-stamp-full`      | 40 x 40   | Loyalty card: an earned cup, tinted by `--tea`.                   |
| `kt-stamp-free`      | 40 x 40   | Loyalty card: the tenth cup, accent filled with a star.           |

`#kt-cup-inner` is a clip path in the cup space.
Draw the liquid as a `<rect>` filled with `var(--tea)` inside it and move the rect's top edge to set the level.

## Variables

| Variable        | Normally                                         |
| --------------- | ------------------------------------------------ |
| `--tea`         | `MenuItem.colour`                                |
| `--cup-line`    | `var(--color-text)` on light, the accent in dark |
| `--cup-surface` | `var(--color-surface)`                           |
| `--straw`       | `var(--color-accent)`                            |
| `--pearl`       | `var(--color-text)`                              |
| `--pearl-mini`  | a lighter shade of the tea                       |
| `--jelly`       | the topping's own colour                         |
| `--foam`        | `var(--color-surface)`                           |
| `--ice`         | white                                            |

Colours that are product data (the tea, a topping's tint) come in as data; everything else comes from tokens, so the theme guard stays satisfied.

## How choices map onto the cup

- **Sugar** sets the tea's depth: 0% is the drink colour mixed 45% towards white, 100% is the colour as given, the steps in between are linear. Sweeter reads darker and richer.
- **Ice** sets what floats at the top: Warm shows steam and no cubes, No ice shows nothing, Less ice two cubes, Normal ice four cubes. Cubes sit just below the liquid line.
- **Toppings** stack by kind: sinkers (boba, mini pearls, taro, agar) fill rows from the bottom, one lot is one row of five; floaters (jellies, popping balls) scatter in the middle band; caps (milk foam, ice cream, brulee) sit on the surface and lower the liquid a little; pudding sits just under the surface. Each added lot animates in from the top over `--motion-slow` with `--ease` and settles.
- **Quantity** of the drink does not change the cup; it is shown as a count beside it.

## Loyalty card

Ten stamps in a row of five by two.
Earned stamps are `kt-stamp-full` in the colour of the drink that earned them, so the card tells the story of what you drank.
The tenth is `kt-stamp-free`.
A new stamp scales up from the centre over `--motion-slow` with `--ease` and the free cup wobbles once when it unlocks.

The preview lab for both is in the Cup Lab artifact linked from `knowledge/home-screen.md`.
