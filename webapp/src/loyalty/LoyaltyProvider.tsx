import type { LoyaltyCard, Order } from '@bbt/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { LoyaltyClient } from './LoyaltyClient';

export type LoyaltyState =
  | { kind: 'signed-out' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; card: LoyaltyCard };

export interface Loyalty {
  state: LoyaltyState;
  /** Stamps every drink in a collected order. Safe to call twice; the api ignores repeats. */
  earnFromOrder(order: Order): Promise<void>;
  /** Uses one free drink. Rejects with the api's message when none is available. */
  redeem(): Promise<void>;
  refresh(): Promise<void>;
}

const LoyaltyContext = createContext<Loyalty | null>(null);

type LoyaltyProviderProps = {
  client: LoyaltyClient;
  children: ReactNode;
};

/**
 * Owns the pearl card for the signed in person: loads it when a session appears, clears it on
 * sign out, and updates it when an order is collected or a free drink is used.
 */
export function LoyaltyProvider({ client, children }: LoyaltyProviderProps) {
  const auth = useAuth();
  const token = auth.session?.token ?? null;
  const [state, setState] = useState<LoyaltyState>({ kind: 'signed-out' });

  const load = useCallback(async () => {
    if (!token) {
      setState({ kind: 'signed-out' });
      return;
    }
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    try {
      setState({ kind: 'ready', card: await client.card(token) });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not load your pearls',
      });
    }
  }, [client, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<Loyalty>(
    () => ({
      state,
      async earnFromOrder(order) {
        if (!token) return;
        const card = await client.earn(token, {
          orderId: order.id,
          lines: order.lines.map((line) => ({
            itemId: line.itemId,
            name: line.name,
            quantity: line.quantity,
          })),
        });
        setState({ kind: 'ready', card });
      },
      async redeem() {
        if (!token) throw new Error('Sign in first');
        setState({ kind: 'ready', card: await client.redeem(token) });
      },
      refresh: load,
    }),
    [client, load, state, token],
  );

  return <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>;
}

export function useLoyalty(): Loyalty {
  const loyalty = useContext(LoyaltyContext);
  if (!loyalty) {
    throw new Error('useLoyalty must be used inside a LoyaltyProvider');
  }
  return loyalty;
}
