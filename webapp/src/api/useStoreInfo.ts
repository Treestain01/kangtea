import type { Store } from '@bbt/shared';
import { useEffect, useState } from 'react';
import { fetchStore } from './client';

/** Loads just the store, for chrome that shows where you pick up (the desktop sidebar). */
export function useStoreInfo(): Store | null {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchStore()
      .then((loaded) => {
        if (!cancelled) setStore(loaded);
      })
      .catch(() => {
        if (!cancelled) setStore(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return store;
}
