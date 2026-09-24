import type { Account, Order } from '@bbt/shared';
import { useSyncExternalStore } from 'react';
import { useStores } from './StoresProvider';
import type { CartLine } from './types';

/** Current cart lines. Re-renders when the cart changes. */
export function useCart(): CartLine[] {
  const { cart } = useStores();
  return useSyncExternalStore(cart.subscribe, cart.read, cart.read);
}

/** Every order, newest first. Re-renders when any order changes. */
export function useOrders(): Order[] {
  const { orders } = useStores();
  return useSyncExternalStore(orders.subscribe, orders.read, orders.read);
}

/** The local profile, or null. */
export function useAccount(): Account | null {
  const { account } = useStores();
  return useSyncExternalStore(account.subscribe, account.read, account.read);
}
