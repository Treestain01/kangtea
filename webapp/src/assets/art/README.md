# Cup art

`cup-parts.svg` is the part library for the live cup in the customise sheet and for the pearl loyalty card.
Everything is vector so it tints from the drink colour and the theme tokens and can animate.
Compose parts with `<use href="#kt-...">`; nothing here is a finished picture.

## Parts

| Symbol               | Space     | Use                                                                                                  |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `kt-cup-body`        | 120 x 200 | Translucent cup wall.                                                                                |
| `kt-cup-lid`         | 120 x 200 | Dome lid and rim.                                                                                    |
| `kt-straw`           | 120 x 200 | Straw at 8 degrees, coloured `--straw`.                                                              |
| `kt-tea-sheen`       | 120 x 200 | Gradient laid over the liquid so any tea colour reads as a drink.                                    |
| `kt-steam`           | 120 x 200 | Two wisps above the lid, for the Warm ice level.                                                     |
| `kt-ice-cube`        | 24 x 24   | One cube. Two for Less ice, four for Normal ice; floats fully under the surface.                     |
| `kt-pearl`           | 24 x 24   | Boba. Sinks to the bottom rows.                                                                      |
| `kt-pearl-mini`      | 24 x 24   | Mini pearl. Sinks.                                                                                   |
| `kt-taro-ball`       | 24 x 24   | Mini taro ball. Sinks.                                                                               |
| `kt-agar-ball`       | 24 x 24   | Agar ball. Sinks, translucent.                                                                       |
| `kt-jelly-cube`      | 24 x 24   | Grass, coconut or tea jelly. Sinks, tinted by `--jelly`.                                             |
| `kt-popping-ball`    | 24 x 24   | Water chestnut or barley popping ball. Sinks.                                                        |
| `kt-foam-cap`        | 120 x 40  | Milk foam, a flat topped band across the full cup width, surface line at y=30. Draw inside the clip. |
| `kt-ice-cream-scoop` | 24 x 24   | Vanilla ice cream, one big round scoop. One sinking body per lot, about three pearls wide.           |
| `kt-brulee`          | 120 x 16  | Caramel crust, full cup width, surface line at y=6. Draw inside the clip.                            |
| `kt-pudding`         | 24 x 24   | Pudding. One large block per lot, sinks with the pearls.                                             |
| `kt-stamp-empty`     | 40 x 40   | Loyalty card: a cup still to earn, dashed.                                                           |
| `kt-stamp-full`      | 40 x 40   | Loyalty card: an earned cup, tinted by `--tea`.                                                      |
| `kt-stamp-free`      | 40 x 40   | Loyalty card: the tenth cup, accent filled with a star.                                              |

`#kt-cup-inner` is a clip path in the cup space.
Draw the liquid as a `<rect>` filled with `var(--tea)` inside it and move the rect's top edge to set the level.

## Variables

| Variable        | Normally                                                           |
| --------------- | ------------------------------------------------------------------ |
| `--tea`         | `MenuItem.colour`                                                  |
| `--cup-line`    | `var(--color-text)` on light, the accent in dark                   |
| `--cup-surface` | `var(--color-surface)`                                             |
| `--straw`       | `var(--color-accent)`                                              |
| `--pearl`       | dark brown `#33261F` in both themes, a product colour like the tea |
| `--pearl-mini`  | a lighter shade of the tea                                         |
| `--jelly`       | the topping's own colour                                           |
| `--foam`        | cream `#F7F0E3` in both themes, a product colour like the tea      |
| `--ice`         | white                                                              |

Colours that are product data (the tea, tapioca, foam, a topping's tint) are fixed in both themes and arrive as data; the cup outline, lid and straw come from tokens, so the theme guard stays satisfied.

## How choices map onto the cup

- **Sugar** sets the tea's depth: 0% is the drink colour mixed 45% towards white, 100% is the colour as given, the steps in between are linear. Sweeter reads darker and richer.
- **Ice** sets what floats at the top: Warm shows steam and no cubes, No ice shows nothing, Less ice two cubes, Normal ice four cubes. Cubes sit just below the liquid line.
- **Toppings** are rigid bodies in a small 2D physics world (Matter.js), rendered as these symbols.
  Sinkers (boba, mini pearls, taro, agar) fall in from above the lid, bounce once and pile at the bottom, five bodies per lot.
  Gravity is tuned so a pearl reaches the bottom in well under a second (engine gravity scale 0.0011 in cup units, light air drag).
  Jellies and popping balls sink too, four bodies per lot; the vanilla ice cream scoop is one large sinking body per lot.
  Caps (milk foam and brulee) are not physical; they fade in on the surface over `--motion-slow`, lower the tea by their own thickness (brulee 6, milk foam 16 cup units), and are drawn inside the cup clip so the slanted walls trim them to the inner width.
  Pudding is one large block per lot, about twice a pearl, that sinks and piles with them.
  Each kind collides only with the cup and its own kind, so pearls sink straight through the ice.
- **Ice** cubes are bodies too, held fully submerged with their top edge about 3 units under the surface, so they float without breaking it.
- Under `prefers-reduced-motion` the world is stepped to rest instantly after each change and drawn once, so nothing moves.
- **Quantity** of the drink does not change the cup; it is shown as a count beside it.

## Loyalty card

Ten stamps in a row of five by two.
Earned stamps are `kt-stamp-full` in the colour of the drink that earned them, so the card tells the story of what you drank.
The tenth is `kt-stamp-free`.
A new stamp scales up from the centre over `--motion-slow` with `--ease` and the free cup wobbles once when it unlocks.

In the app: `src/components/cup/LiveCup.tsx` composes these parts, `cupParts.ts` maps menu names to them (change it with this file), and `cupPhysics.ts` runs the world. `CupSprite.tsx` injects this file into the document. It must stay zero sized rather than `display: none`, or the clip path and gradient inside it stop resolving; `LiveCup` also carries its own copy of the inner clip (`CUP.innerPath`) so the tea is always trimmed to the walls.
The preview lab for both is the Cup Lab artifact: https://claude.ai/artifact/H9wmEpxuGnWqrBaUQ65jFb (private to Tristan's account).
In the app the engine will load with the customise sheet only, through a dynamic import, so the rest of the site pays nothing for it.
