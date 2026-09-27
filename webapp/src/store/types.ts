import type { AuthSession, Order, OrderLine, OrderStatus } from '@bbt/shared';
import type { Preferences } from './preferences';

/** A line in the cart has the same shape as a line in a placed order. */
export type CartLine = OrderLine;

export interface CartStore {
  read(): CartLine[];
  /** Adds a line, merging its quantity into an existing line with the same drink and customisations. */
  add(line: CartLine): void;
  /** Sets a line's quantity by its lineKey. Zero removes the line. */
  setQuantity(lineKey: string, quantity: number): void;
  /** Replaces the whole cart, used by "Order again". */
  replace(lines: CartLine[]): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export interface OrdersStore {
  /** Every order, newest first. */
  read(): Order[];
  /** Creates a received order from the lines and returns it. */
  place(lines: CartLine[], storeId: string, now?: Date): Order;
  setStatus(orderId: string, status: OrderStatus, now?: Date): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

/**
 * The signed in session: bearer token, user and account as the api last sent them.
 * The api owns accounts; this is the device's copy. Null means signed out.
 */
export interface SessionStore {
  read(): AuthSession | null;
  save(session: AuthSession): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

/** Device preferences such as the theme. Always has a value; there is no clear. */
export interface PreferencesStore {
  read(): Preferences;
  save(preferences: Preferences): void;
  subscribe(listener: () => void): () => void;
}

export interface Stores {
  cart: CartStore;
  orders: OrdersStore;
  session: SessionStore;
  preferences: PreferencesStore;
}
