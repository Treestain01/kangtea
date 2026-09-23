# 0006 CSS custom property theme with a test guard

Date: 2026-09-24
Status: Accepted

## Context

Agents build most of the webapp UI.
The brand has two colours (warm grey `#CBC6C3` as the main colour, blue `#2233C0` as the highlight) and the app must look consistent on phones and desktops in light and dark mode.
Rules that live only in prose are forgotten after enough edits.

## Decision

Design tokens are CSS custom properties in `webapp/src/theme/tokens.css`, with dark values under `prefers-color-scheme: dark`.
Breakpoints are constants in `webapp/src/theme/breakpoints.ts` (768 and 1024).
A Vitest guard (`tokens.test.ts`) fails the build when any other source file writes a colour literally, references an undefined token, or uses an undocumented media query width.
`webapp/knowledge/theme.md` documents every token's role.

## Alternatives considered

- Tailwind or another utility framework: a large dependency for a two colour brand, and its config becomes a second source of truth alongside any CSS.
- CSS-in-JS theme object: pushes styling into the JS bundle and makes dark mode a runtime concern instead of a media query.
- Tokens plus a linting rule only: Stylelint would need its own toolchain; a Vitest file runs in the existing `pnpm check`.

## Consequences

- Colour changes are one file edits that propagate everywhere.
- Agents cannot hardcode a colour without breaking `pnpm check`.
- Adding a token means editing `tokens.css` and `theme.md` together.
- `color-mix()` is used for the focus ring, which requires iOS 16.2 or newer WebKit. The shell targets iOS 17.
