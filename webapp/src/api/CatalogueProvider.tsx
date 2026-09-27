import type { Menu, Store } from '@bbt/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  readCachedCatalogue,
  sessionCacheStorage,
  writeCachedCatalogue,
  type LoadedCatalogue,
} from './catalogueCache';
import { fetchMenu, fetchStore } from './client';

export type Catalogue =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; store: Store; menu: Menu };

export interface CatalogueContextValue {
  catalogue: Catalogue;
  /** Fetches again, ignoring the cache. Used by the error state. */
  retry: () => void;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

type CatalogueProviderProps = {
  /**
   * Where to cache for the tab's lifetime. Defaults to sessionStorage; pass null for no cache.
   * Tests pass null so every render starts from the mocked fetches.
   */
  storage?: Storage | null;
  children: ReactNode;
};

/**
 * Loads the store and the menu once for the whole app and shares them with every page and
 * panel. The result is kept in sessionStorage, so a reload in the same tab paints from the cache
 * without a request; a new tab fetches fresh. `retry` bypasses the cache.
 */
export function CatalogueProvider({ storage, children }: CatalogueProviderProps) {
  const cache = storage === undefined ? sessionCacheStorage() : storage;
  const [catalogue, setCatalogue] = useState<Catalogue>(() => {
    const cached = readCachedCatalogue(cache);
    return cached ? { kind: 'ready', ...cached } : { kind: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);
  // The request in progress, if any. StrictMode runs the effect twice on mount in development;
  // the second run awaits the same promise instead of firing a second pair of requests.
  const inFlight = useRef<{ attempt: number; promise: Promise<LoadedCatalogue> } | null>(null);

  useEffect(() => {
    // The first attempt is satisfied by the cache when there is one; retries always fetch.
    if (attempt === 0 && readCachedCatalogue(cache)) return;
    let cancelled = false;
    setCatalogue({ kind: 'loading' });
    if (inFlight.current?.attempt !== attempt) {
      const promise = Promise.all([fetchStore(), fetchMenu()])
        .then(([store, menu]): LoadedCatalogue => ({ store, menu }))
        .finally(() => {
          if (inFlight.current?.promise === promise) inFlight.current = null;
        });
      inFlight.current = { attempt, promise };
    }
    inFlight.current.promise
      .then((loaded) => {
        if (cancelled) return;
        writeCachedCatalogue(cache, loaded);
        setCatalogue({ kind: 'ready', ...loaded });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogue({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, cache]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const value = useMemo(() => ({ catalogue, retry }), [catalogue, retry]);
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/** The shared catalogue. Every page that shows drinks or the store reads this. */
export function useCatalogue(): CatalogueContextValue {
  const value = useContext(CatalogueContext);
  if (!value) {
    throw new Error('useCatalogue must be used inside a CatalogueProvider');
  }
  return value;
}

/** Just the store, or null while loading or failed. For chrome such as the sidebar pickup card. */
export function useStoreInfo(): Store | null {
  const { catalogue } = useCatalogue();
  return catalogue.kind === 'ready' ? catalogue.store : null;
}
