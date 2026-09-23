/**
 * Viewport breakpoints in CSS pixels. Mobile first: base styles target phones,
 * `@media (min-width: 768px)` adds tablet and desktop layout on top.
 *
 * Custom properties cannot be used inside @media, so CSS repeats these numbers.
 * src/theme/tokens.test.ts fails if a stylesheet uses any other width.
 */
export const BREAKPOINTS = {
  /** Tablet portrait and up. */
  md: 768,
  /** Desktop and up. */
  lg: 1024,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
