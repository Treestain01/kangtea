# 0018 Live cup with a physics world

Date: 2026-09-27
Status: Accepted

## Context

Tristan wants ordering to feel playful.
The first piece is a cup in the customise sheet that builds itself as sugar, ice and toppings change, with toppings that visibly drop in rather than appear.
Flat images cannot take the drink's colour or the theme, and hand animated drops look canned once two lots pile up.
The art was agreed in the Cup Lab artifact before any app code was written.

## Decision

The cup is an SVG part library (`webapp/src/assets/art/cup-parts.svg`) composed by a `LiveCup` React component.
Toppings and ice are rigid bodies in a small Matter.js world shaped like the inside of the cup (`components/cup/cupPhysics.ts`); the component reads body positions each frame and moves `<use>` elements.
Only milk foam and brulee are not bodies: they fade in on the surface, drawn inside the cup clip so the slanted walls trim them.
Ice is the only buoyant kind and floats fully under the surface; everything else sinks and piles.
Matter.js is loaded with a dynamic import inside `LiveCup`, so it ships only when the customise sheet opens.
`components/cup/cupParts.ts` maps menu data to art by topping name and holds the product colours (tapioca, cream, topping tints); it is exempt from the theme guard for the same reason the test fixtures are.
Under `prefers-reduced-motion`, and in tests where `matchMedia` is missing, the world is stepped to rest synchronously and drawn once.

## Alternatives considered

- CSS keyframes per topping: fine for one lot, wrong the moment a second lot has to land on the first.
- A hand rolled circle physics loop: a hundred lines that would grow toward what Matter.js already does well (stacking, rotation, sleeping), for a saving of about 25 KB gzipped on one lazily loaded route.
- Raster illustrations generated per drink: cannot tint from tokens or data, and would put fixed colours in front of the theme guard.
- Making the caps bodies too: foam on a real drink is a layer, and a floating body never reads as one.

## Consequences

- The customise sheet now pulls a second chunk on first open. Measure it in the Vercel deploy; if it hurts, prefetch the chunk when a drink card is pressed.
- Art rules live in `src/assets/art/README.md` and are mirrored by `cupParts.ts`; change both together.
- New toppings get art by name keywords, so a topping the mapping has never seen still shows as pearls rather than nothing.
- The `CupSprite` must be rendered once wherever a `LiveCup` appears; today that is the sheet.
- The home screen cards keep the flat CSS `CupIllustration`; the live cup is a sheet feature.
