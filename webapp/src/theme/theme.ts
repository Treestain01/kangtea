import type { ThemePreference } from '../store/preferences';
import type { PreferencesStore } from '../store/types';

/**
 * Reflects the theme preference on the document.
 * An explicit choice sets `data-theme` so tokens.css overrides the device setting;
 * `system` removes it so the `prefers-color-scheme` media query decides again,
 * unless it is evening: then system goes dark while the shop is closed.
 */
export function applyTheme(
  preference: ThemePreference,
  root: HTMLElement = document.documentElement,
  { evening = false }: { evening?: boolean } = {},
): void {
  if (preference === 'system') {
    if (evening) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }
}

/** Applies the stored preference now and again on every change. Returns the unsubscribe. */
export function bindTheme(
  preferences: PreferencesStore,
  root: HTMLElement = document.documentElement,
): () => void {
  const sync = () => applyTheme(preferences.read().theme, root);
  sync();
  return preferences.subscribe(sync);
}
