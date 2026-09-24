---
name: responsive-ui
description: Use when creating or changing any .tsx component, page, layout or .css file in webapp. Ensures the change works on phones and desktops, uses theme tokens only, and is verified at both widths before finishing.
---

# Responsive UI (webapp)

Kang Tea is used from phones (including inside the iOS shell) and from desktops.
Every UI change ships for both at once.
This skill is also injected automatically by the `.claude/hooks/responsive-ui-reminder.mjs` hook after any edit to a `webapp/**/*.tsx` or `webapp/**/*.css` file.

## Checklist

Work through every line. Do not skip a line because it "obviously" holds.

### Layout

- [ ] Mobile first: base styles target a 390px wide phone; `@media (min-width: 768px)` and `(min-width: 1024px)` add on top. Those are the only breakpoints (`src/theme/breakpoints.ts`).
- [ ] Nothing has a fixed width wider than the viewport. Use `max-width: 100%`, `min-width: 0` on flex children, and `width: 100%` instead of pixel widths.
- [ ] Rows of items wrap or stack below `768px` (`flex-wrap: wrap`, or `grid-template-columns: 1fr` that becomes multi column at `md`).
- [ ] Text wraps. Long words and URLs get `overflow-wrap: anywhere`.
- [ ] Tables, code blocks and wide diagrams sit inside their own `overflow-x: auto` container. The page body never scrolls horizontally.
- [ ] Side gutters come from `.app` padding (`var(--space-4)` on phones). Do not add a second set inside components.
- [ ] Sticky or fixed elements respect `env(safe-area-inset-*)`, because the iOS shell renders edge to edge.

### Touch and pointer

- [ ] Every tappable element is at least `var(--tap-target)` (44px) tall on phones. Links in running text are exempt.
- [ ] Hover-only affordances have a visible non-hover equivalent. Phones have no hover.
- [ ] Focus is visible: rely on the global `:focus-visible` rule, do not set `outline: none` without a replacement.

### Theme

- [ ] Every colour is `var(--color-*)` from `src/theme/tokens.css`. No hex, `rgb()`, `hsl()` or named colours anywhere else. `src/theme/tokens.test.ts` enforces this.
- [ ] Grey tokens (`--color-bg`, `--color-surface*`, `--color-border`) shape surfaces. The accent (`--color-accent`) is for interactive things only. Text uses `--color-text` or `--color-text-muted`.
- [ ] The component looks right in dark mode. Tokens switch automatically; check that nothing assumes a light background.
- [ ] Spacing and radius come from `--space-*` and `--radius-*`.
- [ ] Motion uses `var(--motion-fast)` or `var(--motion-slow)` with `var(--ease)`, never a literal duration or easing, and is disabled under `prefers-reduced-motion: reduce`.
- [ ] Depth comes only from `--shadow-raised`, `--shadow-raised-sm` and `--shadow-inset`. No borders on surfaces, no ad hoc `box-shadow`. Selected or pressed states use `--shadow-inset` with accent text. Grids leave at least `--space-4` between raised cards so shadows do not clip.

### Verification

- [ ] Run `pnpm --filter @bbt/webapp test`, `lint`, `typecheck`.
- [ ] Start `pnpm dev` at the repo root and open http://localhost:5173.
      Check at 390px wide (phone) and 1280px wide (desktop), in light and dark mode.
      Use the browser's responsive design mode if there is no device.
      If no browser is available in your environment, say so explicitly in the report.
- [ ] Report using this shape:

  ```
  Responsive check: <component or file>
  390px: <what you saw, or "not verified: no browser">
  1280px: <what you saw, or "not verified: no browser">
  Dark mode: <ok / issue>
  Tokens only: <yes, tokens.test.ts passes>
  Touch targets: <ok / which element is below 44px>
  ```

## Rules

- Never fix a phone layout by hiding content. Rearrange it.
- Never add a breakpoint. If 768 and 1024 are wrong for a component, change `breakpoints.ts` and `tokens.css`'s comment together and record why with `record-decision`.
- If the change reveals a missing token, add it to `tokens.css` and `knowledge/theme.md` in the same commit rather than writing a literal colour.
