# Cup art

`cup-parts.svg` is the part library for the live cup in the customise sheet and for the pearl loyalty card.
Everything is vector so it tints from the drink colour and the theme tokens and can animate.
Compose parts with `<use href="#kt-...">`; nothing here is a finished picture.

## Parts

| Symbol               | Space     | Use                                                                                                                                                                          |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kt-cup-body`        | 120 x 200 | Translucent cup wall.                                                                                                                                                        |
| `kt-cup-lid`         | 120 x 200 | Dome lid and rim.                                                                                                                                                            |
| `kt-straw`           | 120 x 200 | Straw at 8 degrees, coloured `--straw`.                                                                                                                                      |
| `kt-tea-sheen`       | 120 x 200 | Gradient laid over the liquid so any tea colour reads as a drink. Draw it inside the clip, under the pieces.                                                                 |
| `kt-steam`           | 120 x 200 | Two wisps above the lid, for the Warm ice level.                                                                                                                             |
| `kt-ice-cube`        | 24 x 24   | One cube at half opacity so the tea reads through it, with a faint `--cup-line` edge. Two for Little ice, three for Less, four for Standard; floats fully under the surface. |
| `kt-pearl`           | 24 x 24   | Boba. Sinks to the bottom rows.                                                                                                                                              |
| `kt-pearl-mini`      | 24 x 24   | Mini pearl. Sinks.                                                                                                                                                           |
| `kt-taro-ball`       | 24 x 24   | Mini taro ball. Sinks.                                                                                                                                                       |
| `kt-agar-ball`       | 24 x 24   | Agar ball. Sinks, translucent.                                                                                                                                               |
| `kt-jelly-cube`      | 24 x 24   | Grass, coconut or tea jelly. Sinks, tinted by `--jelly`.                                                                                                                     |
| `kt-popping-ball`    | 24 x 24   | Water chestnut or barley popping ball. Sinks.                                                                                                                                |
| `kt-foam-cap`        | 120 x 40  | Milk foam, a flat topped band across the full cup width, surface line at y=30. Draw inside the clip.                                                                         |
| `kt-ice-cream-scoop` | 24 x 24   | Vanilla ice cream, one big round scoop. One sinking body per lot, about three pearls wide.                                                                                   |
| `kt-brulee`          | 120 x 16  | Caramel crust, full cup width, surface line at y=6. Draw inside the clip.                                                                                                    |
| `kt-pudding`         | 24 x 24   | Pudding. One large block per lot, sinks with the pearls.                                                                                                                     |
| `kt-stamp-empty`     | 40 x 40   | Loyalty card: a cup still to earn, dashed.                                                                                                                                   |
| `kt-stamp-full`      | 40 x 40   | Loyalty card: an earned cup, tinted by `--tea`.                                                                                                                              |
| `kt-stamp-free`      | 40 x 40   | Loyalty card: the tenth cup, accent filled with a star.                                                                                                                      |

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
| `--pearl-mini`  | the same dark brown as `--pearl`                                   |
| `--jelly`       | the topping's own colour                                           |
| `--foam`        | cream `#F7F0E3` in both themes, a product colour like the tea      |
| `--ice`         | white                                                              |

Colours that are product data (the tea, tapioca, foam, a topping's tint) are fixed in both themes and arrive as data; the cup outline, lid and straw come from tokens, so the theme guard stays satisfied.

## How choices map onto the cup

- **Sugar** sets the tea's depth: 0% is the drink colour mixed 45% towards white, 100% is the colour as given, the steps in between are linear. Sweeter reads darker and richer.
- **Ice** sets what floats at the top: Warm shows steam and no cubes, No ice shows nothing, Little ice two cubes, Less ice three, Standard ice four. Cubes sit just below the liquid line.
- **Toppings** are rigid bodies in a small 2D physics world (Matter.js), rendered as these symbols.
  Sinkers (boba, taro, agar) fall in from above the lid, bounce once and pile at the bottom, ten bodies per lot; mini pearls come thirty-six per lot, a deep heap of them.
  One lot piles two to three rows deep across the cup floor, the 25 to 35 cup units that two to three real centimetres of a serving come to.
  Gravity is tuned so a piece falls fast through the air (engine gravity scale 0.0011 in cup units, light air drag) and then, once under the surface, meets thicker drag, partial buoyancy and a lower speed cap, so it slows as it enters the tea and settles in about a second and a half.
  Jellies sink too, eight bodies per lot, popping balls ten; the vanilla ice cream scoop is one large sinking body per lot.
  A body normally spans its symbol's box; a mini pearl's circle fills just over half of its box, so its body is 8 units to the art's 12 (`PieceSpec.bodySize`) and the pile packs as close as it looks.
  Caps (milk foam and brulee) are not physical and are drawn inside the cup clip so the slanted walls trim them to the inner width.
  Brulee fades in over `--motion-slow` and lowers the tea by its 6 unit thickness.
  In the live cup milk foam is not the symbol but a band of plain rects (`foamBandFor` in `cupParts.ts`) whose bottom edge is always exactly the tea's top edge, never overlapping it; the `kt-foam-cap` symbol still draws the tray token and the static cup.
  The first lot lowers the tea 16 units and the band pours in over the vacated room; every lot after it drops the tea (and the ice floating in it) another 14 units and the same band expands downward to meet it, its top edge fixed two units above the resting line.
  The liquid's level and the band's `y`/`height` are rect geometry gliding over `--motion-pour` with the same ease, so at every frame the foam's bottom and the tea's top interpolate to the same value and no gap or overlap ever shows.
  Pudding is one large block per lot, about twice a pearl, that sinks and piles with them.
  Each kind collides only with the cup and its own kind, so pearls sink straight through the ice.
  The static cup (menu cards, cart rows, the kitchen) keeps its fixed dozen piece slots, so a full serving fills them all.
- **Ice** cubes are bodies too, held fully submerged with their top edge about 3 units under the surface, so they float without breaking it.
  When a cap moves the surface, the physics liquid line eases to the new level over the same `--motion-pour` as the painted tea, so a growing foam cap visibly pushes the ice down ahead of it instead of the ice dropping to the final line first.
- Under `prefers-reduced-motion` the world is stepped to rest instantly after each change and drawn once, so nothing moves.
- **Quantity** of the drink does not change the cup; it is shown as a count beside it.

## Loyalty card

Ten stamps in a row of five by two.
Earned stamps are `kt-stamp-full` in the colour of the drink that earned them, so the card tells the story of what you drank.
The tenth is `kt-stamp-free`.
A new stamp scales up from the centre over `--motion-slow` with `--ease` and the free cup wobbles once when it unlocks.

In the app: `src/components/cup/LiveCup.tsx` composes these parts, `cupParts.ts` maps menu names to them (change it with this file), and `cupPhysics.ts` runs the world. `CupSprite.tsx` injects this file into the document. It must stay zero sized rather than `display: none`, or the clip path and gradient inside it stop resolving; `LiveCup` also carries its own copy of the inner clip (`CUP.innerPath`) so the tea is always trimmed to the walls.
The loyalty stamps are drawn by `src/components/loyalty/LoyaltyCard.tsx` from the same library.
The Cup Lab preview artifact used while drawing these parts has since been deleted; the parts and rules here are the reference.
In the app the engine will load with the customise sheet only, through a dynamic import, so the rest of the site pays nothing for it.
