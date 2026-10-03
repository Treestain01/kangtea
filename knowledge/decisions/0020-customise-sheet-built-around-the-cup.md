# 0020 Customise sheet built around the cup

Date: 2026-10-01
Status: Accepted

## Context

The live cup (ADR 0018) shipped as a 108px thumbnail in the customise sheet's hero, beside the drink name.
The controls that feed it, sugar and ice tracks and a grid of topping tiles, scrolled below it, so the thing that made the sheet fun was the smallest element on screen and often not visible while a choice was made.
Tristan asked for the cup to be the centrepiece and for a more modern, more interactive way to edit the drink.
Three directions were brainstormed in a published artifact: a cup stage with dials either side and a topping tray, gestures on the cup itself, and a stepper of one decision per screen.

## Decision

The sheet is rebuilt as three bands with the cup stage in the middle taking every spare pixel.

- A compact head: name, Chinese name and category on one line, price and close on the right.
- The stage: a vertical sugar dial on the left, the cup filling the middle, a vertical ice dial on the right.
  The dials are the same radio groups as before, turned on their side, highest level at the top, labels on the outer edge, the chosen dot ringed and the dots below it filled.
- A tray of round topping tokens under the cup, one swipeable row.
  Tapping a token drops a lot into the cup; a count badge and a small minus appear on it.
  Each token is drawn with the same symbol the cup drops in, through `components/cup/ToppingArt.tsx`, so the thing you tap and the thing that falls are visibly the same.
- A pinned readout, one line of quantity, drink and choices, above the quantity stepper and the Add button, which carries the live total.

Nothing in the sheet scrolls on a phone.
On a very short screen the builder band scrolls rather than letting the cup shrink below a useful size.

## Alternatives considered

- Gestures on the cup itself (drag the tea for sugar, tap the lid for ice, toppings orbiting the cup): the most toy like, but not discoverable without coach marks and it needs a second, hidden set of controls for keyboard and screen reader users.
  Kept as a possible bonus on top of this layout, not instead of it.
- A stepper of one decision per screen: clearest for a first time customer, but four taps minimum for a plain drink and the cup is passive between steps.
- Keeping the hero and enlarging the thumbnail: the controls would still be out of view while the cup reacts to them.

## Consequences

- The itemised summary with per topping prices is gone from the sheet; the readout names the choices and the Add button carries the total.
  The order panel still itemises after adding.
- The hand drawn topping icons in the old tile grid are retired in favour of the SVG part library, so a new topping gets its icon from the same name rules as its cup art.
- The sheet depends on its height now: the cup is sized to the space the dials and tray leave.
  Any new control added to the sheet must earn its vertical pixels.
- The brainstorm artifact with the three directions has since been deleted; this record and the shipped sheet are what remain of it.
