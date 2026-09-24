import type { Account, MenuItem, Order, OrderLine, OrderStatus } from '@bbt/shared';

/** A line in the cart has the same shape as a line in a placed order. */
export type CartLine = OrderLine;

export interface CartStore {
  read(): CartLine[];
  /** Adds one of the item, merging with an existing line for the same item. */
  add(item: MenuItem): void;
  /** Sets a line's quantity. Zero removes the line. */
  setQuantity(itemId: string, quantity: number): void;
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

export interface AccountStore {
  read(): Account | null;
  save(account: Account): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export interface Stores {
  cart: CartStore;
  orders: OrdersStore;
  account: AccountStore;
}
