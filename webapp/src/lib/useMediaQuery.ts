import { useSyncExternalStore } from 'react';

/** Matches the `md` breakpoint in src/theme/breakpoints.ts. */
export const TABLET_QUERY = '(min-width: 768px)';
/** Matches the `lg` breakpoint in src/theme/breakpoints.ts. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

function mediaQueryList(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;
}

/** True while the viewport matches `query`. False where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = mediaQueryList(query);
      if (!list) return () => {};
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => mediaQueryList(query)?.matches ?? false,
    () => false,
  );
}
