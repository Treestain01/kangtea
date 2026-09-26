import { createContext, useContext, type ReactNode } from 'react';
import type { Stores } from './types';

const StoresContext = createContext<Stores | null>(null);

type StoresProviderProps = {
  stores: Stores;
  children: ReactNode;
};

/** Makes the cart, orders, account and preferences stores available to every page. Tests inject in memory stores. */
export function StoresProvider({ stores, children }: StoresProviderProps) {
  return <StoresContext.Provider value={stores}>{children}</StoresContext.Provider>;
}

export function useStores(): Stores {
  const stores = useContext(StoresContext);
  if (!stores) {
    throw new Error('useStores must be used inside a StoresProvider');
  }
  return stores;
}
