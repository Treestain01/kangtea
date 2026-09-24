# 0008 Neumorphic surface treatment

Date: 2026-09-24
Status: Superseded by 0011

## Context

Tristan asked for a more neumorphic feel after seeing the first home screen.
The brand's main colour is a warm grey, which is the ground neumorphism was designed for.
Neumorphism has a known weakness: when contrast lives in soft shadows, controls and text can become hard to see.

## Decision

Surfaces (`--color-surface`) share the page colour (`--color-bg`) and read as raised or pressed through two soft shadows from `--shadow-*` tokens in `webapp/src/theme/tokens.css`.
Borders are removed from surfaces.
Selected and pressed states are inset with accent coloured text instead of an accent fill.
Text keeps its existing contrast against the ground and never relies on shadows.
Focus is an outline (`--focus-outline`) rather than a box shadow so it composes with the surface shadow.
Dark mode defines its own shadow colours rather than inverting the light ones.

## Alternatives considered

- Keep flat white cards with borders: clear but generic, and it wastes the brand grey.
- Glassmorphism: needs imagery or gradients behind translucent panels; the app has neither.
- Accent filled controls on a neumorphic ground: mixes two vocabularies and makes the navy shout.

## Consequences

- Every component takes depth from three tokens, so the look can be tuned or replaced in one file.
- The responsive UI checklist and `webapp/knowledge/theme.md` carry the contrast rules; a reviewer should reject shadows used for anything you read.
- Grids need generous gaps for shadow spread, which slightly lowers information density on phones.
- `color-mix()` is used more heavily; the iOS shell targets iOS 17, which supports it.
