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
import { PRODUCT_COLOURS } from '../components/cup/cupParts';
import type { LoyaltyClient } from './LoyaltyClient';

/** A provisional stamp for a drink the menu no longer names. Product colour, like the drink colours. */
const FALLBACK_STAMP_COLOUR = PRODUCT_COLOURS.tea;

export type LoyaltyState =
  | { kind: 'signed-out' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; card: LoyaltyCard };

export interface Loyalty {
  state: LoyaltyState;
  /**
   * Stamps every paid drink in a collected order. The card updates at once with provisional stamps,
   * in the colours given, and the server's card replaces them when it answers. Safe to call twice;
   * the api ignores repeats.
   */
  earnFromOrder(order: Order, colourOf?: (itemId: string) => string | undefined): Promise<void>;
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
      async earnFromOrder(order, colourOf = () => undefined) {
        if (!token) return;
        // The free drink earned nothing; the paid drinks on the order each earn a stamp.
        const lines = order.lines
          .map((line, index) => ({
            itemId: line.itemId,
            name: line.name,
            quantity: line.quantity - (order.freeDrink?.lineIndex === index ? 1 : 0),
          }))
          .filter((line) => line.quantity > 0);
        if (lines.length === 0) return;
        // Provisional stamps go on the card now, so it fills as the pearl lands rather than when
        // the network answers. The api's rules apply: a tenth stamp finishes the card and the
        // rest start the next one.
        setState((current) => {
          if (current.kind !== 'ready') return current;
          const earnedAt = new Date().toISOString();
          const pending = lines.flatMap((line) =>
            Array.from({ length: line.quantity }, (_, n) => ({
              id: `pending:${order.id}:${line.itemId}:${n}`,
              itemName: line.name,
              colour: colourOf(line.itemId) ?? FALLBACK_STAMP_COLOUR,
              earnedAt,
            })),
          );
          const combined = [...current.card.stamps, ...pending];
          const finished = Math.floor(combined.length / current.card.stampsPerCard);
          const available = current.card.available + finished;
          return {
            kind: 'ready',
            card: {
              ...current.card,
              earned: current.card.earned + pending.length,
              available,
              complete: available > 0,
              stamps: combined.slice(finished * current.card.stampsPerCard),
            },
          };
        });
        const card = await client.earn(token, { orderId: order.id, lines });
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
