# 0022 Tea house surfaces in tonal tiers

Date: 2026-10-02
Status: Accepted. Supersedes 0011 where it made borders the way surfaces are separated.

## Context

With the cup, the motion and the second round of interactions in place, the app still read as a default component library: white cards with a 1px grey border and one radius for everything, every block weighing the same, grey wells behind the drinks, a standard icon and label tab bar and a sidebar of outlined boxes.
Three directions were mocked up live in an artifact: a warm tea house built from tonal tiers, a dark glass night market, and a poster like menu board.
Tristan chose the tea house.

## Decision

Surfaces are separated by tone, not by lines.

- Three neutral tiers, warmed from the brand grey: the page (`--color-bg`), cards and panels (`--color-surface`) and the wells inside them (`--color-surface-muted`).
  `--color-border` stays for form fields and for dashed rules between totals and lines.
- Cards take `--radius-xl` (22px); inner panels and wells `--radius-lg` and `--radius-md`.
- Drink cards are tinted by the drink: the art is a well in the drink's colour at 16% running to the card's edges, the cup stands proud of the well's top edge with `--shadow-object` as a drop shadow filter, the tag sits at the well's foot in the drink's colour deepened toward ink, and the plus is an ink square.
- The greeting is Fraunces at optical size 144 and weight 500, with the time of day in italic navy.
  Chinese names are set in `--font-zh` (Noto Serif TC) at reading size rather than as muted captions.
- Category chips are an underlined text row.
  The phone tab bar is a floating ink pill above the safe area; the desktop sidebar is text with an accent dot for the current page.
- Primary buttons settle to 0.97 on press; cards lift 2px on hover.
- The flat surfaces guard keeps its meaning: the only `box-shadow` is still `--shadow-float` on the sheet.
  The cup's shadow is a `filter: drop-shadow` because the cup is an object on a surface, not a surface.

## Alternatives considered

- Night market: dark first with glass and glow. Kept as a possible evening expression later; it would need shadows and a second light design.
- Menu board: ink outlines and hard offset shadows. Better for signage and campaigns than for daily ordering.
- Keeping borders and only warming the palette: the borders were most of what read as stock.

## Consequences

- Every component stylesheet dropped its card border in one pass; the token names are unchanged apart from the additions `--radius-xl`, `--shadow-object` and `--font-zh`.
- The drink grid leaves room above each row for the cup that stands proud of its card (`--cup-overflow`).
- Dark mode is the same tiers in reverse with a slightly brighter accent, so the chosen colours stay readable on the ink pill and the tinted wells.
- The mockup of the three directions has since been deleted; this record and the shipped styles are what remain of it.
