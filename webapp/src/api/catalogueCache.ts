import { MenuSchema, StoreSchema, type Menu, type Store } from '@bbt/shared';
import { z } from 'zod';

export type LoadedCatalogue = { store: Store; menu: Menu };

const CachedCatalogueSchema = z.object({ store: StoreSchema, menu: MenuSchema });

/** One key in sessionStorage, so the catalogue lives as long as the tab and no longer. */
export const CATALOGUE_CACHE_KEY = 'kangtea.catalogue';

/** The tab's sessionStorage, or null where it does not exist or is blocked (tests, private modes). */
export function sessionCacheStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The cached catalogue if it is present and still matches the contract; anything else is dropped. */
export function readCachedCatalogue(storage: Storage | null): LoadedCatalogue | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CATALOGUE_CACHE_KEY);
    if (raw === null) return null;
    const parsed = CachedCatalogueSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    storage.removeItem(CATALOGUE_CACHE_KEY);
  } catch {
    // Not JSON or storage refused; behave as if nothing was cached.
  }
  return null;
}

export function writeCachedCatalogue(storage: Storage | null, catalogue: LoadedCatalogue): void {
  if (!storage) return;
  try {
    storage.setItem(CATALOGUE_CACHE_KEY, JSON.stringify(catalogue));
  } catch {
    // Quota or a blocked store: the app still works, it just refetches next time.
  }
}
