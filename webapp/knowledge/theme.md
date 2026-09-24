# Theme

## Source of truth

`src/theme/tokens.css` defines every colour, spacing step, radius and the focus ring as CSS custom properties.
`src/theme/breakpoints.ts` defines the two viewport breakpoints.
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

| Token                   | Light     | Dark      | Role                                                                                           |
| ----------------------- | --------- | --------- | ---------------------------------------------------------------------------------------------- |
| `--color-bg`            | `#ECE8E6` | `#221F1D` | Page background.                                                                               |
| `--color-surface`       | `#ECE8E6` | `#221F1D` | Cards, chips, buttons. Same as the page on purpose: depth comes from `--shadow-*`, not colour. |
| `--color-surface-muted` | `#E2DDDA` | `#1B1917` | Secondary fills where a shadow would be too much, such as the default cup tint.                |
| `--color-border`        | `#CBC6C3` | `#4A4541` | Dividers and outlines. Light mode uses the brand grey directly.                                |
| `--color-text`          | `#2B2826` | `#EDEAE8` | Body text.                                                                                     |
| `--color-text-muted`    | `#6B655F` | `#A8A19C` | Secondary text, captions, placeholders. Passes 4.5:1 on `--color-bg`.                          |

## Semantic

| Token             | Light     | Dark      | Role                         |
| ----------------- | --------- | --------- | ---------------------------- |
| `--color-success` | `#1F7A4D` | `#5FC78F` | Positive status.             |
| `--color-warning` | `#A35D00` | `#E0A04A` | Caution.                     |
| `--color-danger`  | `#B3261E` | `#EF7B74` | Errors, destructive actions. |

## Elevation (neumorphic)

The UI is neumorphic: surfaces share the page colour and read as raised or pressed through two soft shadows, light from the top left and dark from the bottom right.
Shadows are the only permitted depth device.
Borders are not used on surfaces; `--color-border` remains for hairlines such as the cup lid.

| Token                             | Use                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `--shadow-light`, `--shadow-dark` | The two shadow colours, defined per theme. Never used directly by components.                       |
| `--shadow-raised`                 | Cards and tiles at rest.                                                                            |
| `--shadow-raised-sm`              | Chips, small buttons, pills.                                                                        |
| `--shadow-inset`                  | Pressed state (`:active`, `aria-pressed="true"`) and wells that hold content, such as the cup area. |

Rules:

- Text never depends on the shadows for contrast. Body and muted text keep the same contrast as before against `--color-bg`.
- A selected control is pressed in with accent coloured text, not filled with the accent.
- Press transitions are 120ms on `box-shadow` and `color`, and disabled under `prefers-reduced-motion: reduce`.
- Grids leave gap for the 14px shadow spread (`--space-4` and up) so neighbouring cards do not clip each other's shadow.
- Dark mode has its own shadow pair. Do not invert the light pair.

## Non-colour tokens

- `--focus-outline`: `3px solid` accent at 60%. Applied globally on `:focus-visible` as an outline so it never replaces a surface's shadow.
- `--space-1` to `--space-6`: 4, 8, 12, 16, 24, 32px as rem.
- `--radius-sm`, `--radius-md`, `--radius-lg`: 4, 8, 20px. Soft shapes need the larger radius.
- `--tap-target`: 44px minimum height for tappable elements on phones.

## Breakpoints

| Name | Width  | Meaning                 |
| ---- | ------ | ----------------------- |
| `md` | 768px  | Tablet portrait and up. |
| `lg` | 1024px | Desktop and up.         |

Mobile first: write phone styles as the base and add `@media (min-width: 768px)` blocks on top.
These two numbers are the only widths allowed in media queries.

## Dark mode

Tokens switch under `@media (prefers-color-scheme: dark)`.
`index.html` declares `color-scheme: light dark`, so native controls follow too.
Components never check the scheme themselves; they read tokens and get the right value.

## Using tokens

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.card__action {
  color: var(--color-on-accent);
  background: var(--color-accent);
  min-height: var(--tap-target);
}
```

## Adding a token

1. Add it to both the `:root` block and, if it is a colour, the dark block in `tokens.css`.
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
