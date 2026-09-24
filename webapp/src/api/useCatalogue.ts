import type { Menu, Store } from '@bbt/shared';
import { useCallback, useEffect, useState } from 'react';
import { fetchMenu, fetchStore } from './client';

export type Catalogue =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; store: Store; menu: Menu };

/** Loads the store and the menu together. Shared by every page that shows drinks. */
export function useCatalogue(): { catalogue: Catalogue; retry: () => void } {
  const [catalogue, setCatalogue] = useState<Catalogue>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogue({ kind: 'loading' });
    Promise.all([fetchStore(), fetchMenu()])
      .then(([store, menu]) => {
        if (!cancelled) setCatalogue({ kind: 'ready', store, menu });
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
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { catalogue, retry };
}
