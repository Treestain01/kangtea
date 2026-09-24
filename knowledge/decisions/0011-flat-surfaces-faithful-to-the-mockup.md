# 0011 Flat surfaces, faithful to the mockup

Date: 2026-09-25
Status: Accepted. Supersedes 0008.

## Context

ADR 0008 introduced a neumorphic treatment.
After living with it across the home screen, the customise sheet and the order pages, Tristan asked to remove it and make the UI faithful to the approved design mockup, which is flat: white cards on the warm grey page with 1px borders, accent filled selections and primary buttons.

## Decision

Surfaces are `--color-surface` (white in light mode) on `--color-bg` (`#F5F3F2`) with `1px solid var(--color-border)`.
Selected states and primary actions are accent filled with `--color-on-accent` text.
Hover changes border colour.
The only shadow is `--shadow-float`, reserved for the customise sheet because it floats above the page; `tokens.test.ts` fails on any other `box-shadow`.
The neutral tokens return to the mockup's values and the `--shadow-raised`, `--shadow-raised-sm` and `--shadow-inset` tokens are removed.

## Alternatives considered

- Keep neumorphism with softer shadows: still not the mockup, and the same-colour surfaces kept fighting readability in dark mode.
- Mixed: flat cards with neumorphic controls: two vocabularies on one screen.

## Consequences

- Every component's CSS was rewritten once; the token names other than shadows are unchanged, so components needed no code changes beyond the drink card's "+" affordance.
- The colour, breakpoint, motion and flat-surface guards keep the system consistent as pages are added.
- The mockup artifact is now the visual reference for new screens.
