# 0007 Accent is the Kang Tea logo navy

Date: 2026-09-24
Status: Accepted

## Context

The app is for Kang Tea (康緹), a bubble tea shop.
ADR 0006 set the accent to `#2233C0`, a royal blue supplied from memory before the logo was available.
The logo turned out to be a monoline mark in a deeper navy.
Sampling the solid interior pixels of the logo gives `#084986` as the dominant colour (97 of 175 interior pixels), with the rest within JPEG noise of it.

## Decision

`--color-accent` in light mode is `#084986`, the sampled logo navy.
`--color-accent-hover` is a darker step of the same hue, `#063A6B`.
Dark mode uses tints of the same hue that hold contrast on the dark ground: `#6BA0E0` accent, `#8FB8EC` hover, `#0B2440` for text on the accent.
The brand grey `#CBC6C3` is unchanged; the logo contains no grey, so the grey remains what Tristan reported the shop uses for surfaces.
The iOS `AccentColor` matches `#084986`.
The mark itself is drawn with `currentColor`, so it always renders in the accent.

## Alternatives considered

- Keep `#2233C0` and treat the logo as a separate brand colour: two blues on one screen with no rule for which to use.
- Use the darkest sampled pixel: the JPEG artefacts around edges are darker than the true ink, so that would overshoot.

## Consequences

- One blue in the product, and it is the one on the shop's sign.
- Navy on white is about 9.5:1, so the accent is usable for body-size text and small icons.
- Any future logo file with a definitive vector or brand guide should be sampled again and this ADR superseded if the value differs.
