import {
  AccountSchema,
  OrderLineSchema,
  OrderSchema,
  orderLinesTotalCents,
  type Account,
  type MenuItem,
  type Order,
  type OrderStatus,
} from '@bbt/shared';
import { z } from 'zod';
import type { AccountStore, CartLine, CartStore, OrdersStore, Stores } from './types';

export const STORAGE_KEYS = {
  cart: 'kangtea.cart',
  orders: 'kangtea.orders',
  account: 'kangtea.account',
} as const;

/** No 0, O, 1 or I, so a code read over the counter cannot be misheard. */
const PICKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomPickupCode(): string {
  return Array.from(
    { length: 4 },
    () => PICKUP_ALPHABET[Math.floor(Math.random() * PICKUP_ALPHABET.length)],
  ).join('');
}

/**
 * One storage key holding one schema-validated value.
 * Reads are cached so useSyncExternalStore gets a stable reference until the next write.
 * Anything that fails to parse is removed and replaced by `empty`; corrupt data never crashes the app.
 */
function createKeyStore<T>(storage: Storage, key: string, schema: z.ZodType<T>, empty: T) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  const notify = () => listeners.forEach((listener) => listener());

  const read = (): T => {
    if (cache !== undefined) return cache;
    const raw = storage.getItem(key);
    if (raw !== null) {
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          cache = parsed.data;
          return cache;
        }
      } catch {
        // Not JSON. Fall through and reset.
      }
      storage.removeItem(key);
    }
    cache = empty;
    return cache;
  };

  const write = (value: T) => {
    cache = value;
    storage.setItem(key, JSON.stringify(value));
    notify();
  };

  const remove = () => {
    cache = empty;
    storage.removeItem(key);
    notify();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { read, write, remove, subscribe };
}

function createCartStore(storage: Storage): CartStore {
  const store = createKeyStore<CartLine[]>(storage, STORAGE_KEYS.cart, z.array(OrderLineSchema), []);
  return {
    read: store.read,
    subscribe: store.subscribe,
    add(item: MenuItem) {
      const lines = store.read();
      const existing = lines.find((line) => line.itemId === item.id);
      if (existing) {
        store.write(
          lines.map((line) =>
            line.itemId === item.id ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        );
        return;
      }
      store.write([
        ...lines,
        {
          itemId: item.id,
          name: item.name,
          unitPriceCents: item.priceCents,
          quantity: 1,
          customisations: [],
        },
      ]);
    },
    setQuantity(itemId, quantity) {
      const lines = store.read();
      if (quantity <= 0) {
        store.write(lines.filter((line) => line.itemId !== itemId));
        return;
      }
      store.write(lines.map((line) => (line.itemId === itemId ? { ...line, quantity } : line)));
    },
    replace(lines) {
      store.write(z.array(OrderLineSchema).parse(lines));
    },
    clear: store.remove,
  };
}

function createOrdersStore(storage: Storage): OrdersStore {
  const store = createKeyStore<Order[]>(storage, STORAGE_KEYS.orders, z.array(OrderSchema), []);
  return {
    read: store.read,
    subscribe: store.subscribe,
    place(lines, storeId, now = new Date()) {
      const timestamp = now.toISOString();
      const order = OrderSchema.parse({
        id: randomId(),
        storeId,
        lines,
        totalCents: orderLinesTotalCents(lines),
        status: 'received',
        placedAt: timestamp,
        updatedAt: timestamp,
        pickupCode: randomPickupCode(),
      });
      store.write([order, ...store.read()]);
      return order;
    },
    setStatus(orderId: string, status: OrderStatus, now = new Date()) {
      store.write(
        store
          .read()
          .map((order) =>
            order.id === orderId ? { ...order, status, updatedAt: now.toISOString() } : order,
          ),
      );
    },
    clear: store.remove,
  };
}

function createAccountStore(storage: Storage): AccountStore {
  const store = createKeyStore<Account | null>(
    storage,
    STORAGE_KEYS.account,
    AccountSchema.nullable(),
    null,
  );
  return {
    read: store.read,
    subscribe: store.subscribe,
    save(account) {
      store.write(AccountSchema.parse(account));
    },
    clear: store.remove,
  };
}

/** All three stores backed by one Storage. Production passes window.localStorage. */
export function createLocalStores(storage: Storage): Stores {
  return {
    cart: createCartStore(storage),
    orders: createOrdersStore(storage),
    account: createAccountStore(storage),
  };
}
