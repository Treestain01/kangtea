# Theme

## Source of truth

`src/theme/tokens.css` defines every colour, spacing step, radius and the focus ring as CSS custom properties.
`src/theme/breakpoints.ts` defines the two viewport breakpoints.
The home page is also a size container (`container: home / inline-size` in `HomePage.css`), so Popular now and the cup of the day lay out by the column they have, which from 1024px is the space between the sidebar and the order panel rather than the viewport.
`src/theme/tokens.test.ts` fails the build if any other non-test file under `src/` writes a colour literally, references an undefined `--color-*` token, or uses a media query width that is not a documented breakpoint.
Test files are exempt because their fixtures carry drink colours as data; components must still receive those at runtime rather than write them.

`main.tsx` imports `tokens.css` before `styles.css` so tokens exist before anything uses them.

## Brand

| Token                  | Light     | Dark      | Role                                                                                                                     |
| ---------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `--color-brand`        | `#CBC6C3` | same      | The main brand colour, a warm grey. Shapes surfaces and borders. Never used for text (contrast on white is about 1.7:1). |
| `--color-accent`       | `#084986` | `#6BA0E0` | The Kang Tea logo navy, sampled from the mark. Links, primary buttons, active states, focus ring.                        |
| `--color-accent-hover` | `#063A6B` | `#8FB8EC` | Hover and pressed state of accent elements.                                                                              |
| `--color-on-accent`    | `#FFFFFF` | `#0B2440` | Text and icons placed on the accent.                                                                                     |

## Neutrals (derived from the brand grey)

| Token                   | Light     | Dark      | Role                                                                        |
| ----------------------- | --------- | --------- | --------------------------------------------------------------------------- |
| `--color-bg`            | `#F4EFE8` | `#1D1A17` | Page background, the brand grey warmed toward cream. The first tier.        |
| `--color-surface`       | `#FFFDF9` | `#27221E` | Cards, panels, inputs, the desktop order panel. The second tier; no border. |
| `--color-surface-muted` | `#ECE4D8` | `#332C26` | The third tier: wells inside cards, quiet buttons, steppers, status pills.  |
| `--color-border`        | `#D9D0C4` | `#4A4541` | Form field outlines and dashed rules only (ADR 0022).                       |
| `--color-text`          | `#2A2522` | `#F1EBE3` | Body text, and the ink of the floating tab bar and the drink card's plus.   |
| `--color-text-muted`    | `#6F655C` | `#AA9F93` | Secondary text, captions, placeholders. Passes 4.5:1 on `--color-bg`.       |

## Semantic

| Token             | Light     | Dark      | Role                         |
| ----------------- | --------- | --------- | ---------------------------- |
| `--color-success` | `#1F7A4D` | `#5FC78F` | Positive status.             |
| `--color-warning` | `#A35D00` | `#E0A04A` | Caution.                     |
| `--color-danger`  | `#B3261E` | `#EF7B74` | Errors, destructive actions. |

## Surfaces (tonal tiers)

The UI is the tea house direction (ADR 0022): surfaces are separated by tone, not by lines.
The page is `--color-bg`, cards and panels sit on it as `--color-surface`, and the wells inside them are `--color-surface-muted`.
The only `box-shadow` in the app is `--shadow-float`, on the customise sheet, because it floats above the page; `tokens.test.ts` fails on any other.
The cup is an object on a surface, so it alone takes `filter: drop-shadow(var(--shadow-object))`.

Rules:

- Cards are `--color-surface` with `--radius-xl` and no border. Wells and small controls take `--radius-md` or `--radius-lg`. `--color-border` outlines form fields and draws dashed rules above totals.
- Drink cards are tinted by the drink: the well is the drink colour at 16% on the surface, the cup stands proud of its top edge, the tag sits at the well's foot in the drink colour deepened toward `--color-text`.
- Selected means accent filled or accent marked: a chosen category is heavier text with a short accent rule, a filled step dot, the active phone tab a lighter pill inside the ink bar, the active sidebar row ink text with an accent dot.
- Primary actions are accent pills with `--color-on-accent` text that settle to 0.97 on press. Secondary actions are quiet text or a `--color-surface-muted` pill.
- The drink card's "+" is an ink square (`--color-text` on `--color-bg`); the whole card is the button.
- Type: the greeting is `--font-display` at optical size 144, weight 500, with the time of day in italic accent; Chinese names are `--font-zh` at reading size.
- Hover on interactive surfaces changes the border to the accent, never adds a shadow.
- Every transition and animation eases in and out via `--ease`, at `--motion-fast` (160ms) for state changes, `--motion-slow` (320ms) for sheets and `--motion-pour` (1100ms) for things that physically fill (the foam pouring onto the live cup), and is disabled under `prefers-reduced-motion: reduce`. `tokens.test.ts` fails on a literal duration or easing outside `tokens.css`.

## Typography

| Token            | Face                                             | Used for                                                                                                       |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `--font-display` | Fraunces (Google Fonts), Georgia fallback        | The greeting, drink names and prices, section headings (`h1` to `h4` by default), Your usual, the pickup code. |
| `--font-body`    | Nunito Sans (Google Fonts), system sans fallback | Everything else. Set on `:root` at 15px with 1.5 line height.                                                  |
| Cinzel           | Google Fonts                                     | The KANGTEA wordmark only.                                                                                     |

Both families load from `index.html` with `display=swap`.
Headings carry `letter-spacing: -0.01em` and `text-wrap: balance`.

## Non-colour tokens

- `--focus-outline`: `3px solid` accent at 60%. Applied globally on `:focus-visible` as an outline so it never replaces a surface's shadow.
- `--space-1` to `--space-6`: 4, 8, 12, 16, 24, 32px as rem.
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`: 4, 8, 16, 22px. Cards take xl, inner panels lg, wells and small controls md, fields sm.
- `--shadow-object`: the cup's drop shadow, used only as a `filter`. `--font-zh`: the serif for Chinese names.
- `--tap-target`: 44px minimum height for tappable elements on phones.
- `--ease` (`ease-in-out`), `--motion-fast` (160ms), `--motion-slow` (320ms), `--motion-pour` (1100ms): the only timing values used by transitions and animations.
- `--tab-bar-height` (64px), `--cart-panel-width` (300px), `--sidebar-width` (locked to `--cart-panel-width`): the fixed layout pieces `.app` leaves room for. Change the panel width and the sidebar follows. See `navigation.md`.

## Breakpoints

| Name | Width  | Meaning                 |
| ---- | ------ | ----------------------- |
| `md` | 768px  | Tablet portrait and up. |
| `lg` | 1024px | Desktop and up.         |

Mobile first: write phone styles as the base and add `@media (min-width: 768px)` blocks on top.
These two numbers are the only widths allowed in media queries.

## Dark mode and the theme choice

By default tokens switch under `@media (prefers-color-scheme: dark)`, and `index.html` declares `color-scheme: light dark` so native controls follow too.
The Account page lets the person choose System, Light or Dark.
The choice lives in the `preferences` store (`store/preferences.ts`, key `kangtea.preferences`) and `src/theme/theme.ts` reflects it on `<html>`: `data-theme="light"` or `data-theme="dark"` for an explicit choice, no attribute for System.
`bindTheme(stores.preferences)` in `main.tsx` applies it before the first render and after every change.
`AppShell` applies it again with the evening flag: with `eveningMode` on in the preferences and the theme on System, `applyTheme` sets `data-theme="dark"` while the shop is closed by its opening hours, checked once a minute.
An explicit Light or Dark choice is never overridden.
The preferences store also holds `sounds` (the cup sounds in `src/lib/sounds.ts`, off by default); both new fields default so preferences saved before they existed still parse.

In `tokens.css` the dark palette appears twice and must stay identical: once under the media query for `:root:not([data-theme='light'])`, and once unconditionally for `:root[data-theme='dark']`.
Each dark block also sets `color-scheme: dark`, and `:root[data-theme='light']` sets `color-scheme: light`, so form controls and scrollbars follow the choice.
`tokens.test.ts` fails if the two dark blocks differ, if a light colour token has no dark value, or if any stylesheet other than `tokens.css` mentions `prefers-color-scheme` or `data-theme`.
Components never check the scheme themselves; they read tokens and get the right value.
See ADR 0016.

## Using tokens

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.card__action {
  min-height: var(--tap-target);
  border: 0;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.card__chip[aria-pressed='true'] {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}
```

## Adding a token

1. Add it to the `:root` block and, if it is a colour, to both dark blocks in `tokens.css` (the guard test reports a miss).
2. Document it in the matching table above with its role.
3. Prefer a new semantic token (`--color-text-muted`) over exposing a raw shade.
4. If it changes the brand palette, record why with the `record-decision` skill.

## Brand assets

The Kang Tea (康緹) logo is a monoline navy mark above the wordmark KANGTEA in a Trajan-style serif, with 康緹 beneath.

- `src/components/brand/KangTeaMark.tsx`: the mark as inline SVG. Strokes use `currentColor`, so set `color` on a parent to recolour it. `size` sets the height; width follows the 35:62 aspect ratio.
- `src/components/brand/KangTeaLogo.tsx`: the full lockup (mark, wordmark, Chinese name) or `variant="mark"` for the mark alone.
- `public/brand/kangtea-mark.svg`: the same mark as a standalone file for favicons, the iOS app icon and anything outside React. Its fallback colour is `#084986`.
- The wordmark uses Cinzel (loaded from Google Fonts in `index.html`) as the closest open face to the logo's Trajan-style capitals, with `letter-spacing: 0.12em`. 康緹 uses the system serif stack.

The mark's colour is `--color-accent`, which is why the accent is the logo navy rather than a separate brand colour.

## The iOS shell

`iosapp/BBT/Assets.xcassets/AccentColor.colorset` is set to the same `#084986`, so native controls in the shell (the offline retry button) match the web accent.
Change both together.
