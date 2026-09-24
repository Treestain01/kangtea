import { OrderSchema } from '@bbt/shared';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, createLocalStores } from './local';
import { cartLineFixture, createMemoryStorage } from './testing';

const signature = cartLineFixture();
const matcha = cartLineFixture({
  itemId: 'matcha-latte',
  name: 'Matcha Latte',
  unitPriceCents: 790,
});
const signatureLessIce = cartLineFixture({
  customisations: [
    { name: 'Sugar', value: '100%' },
    { name: 'Ice', value: 'Less ice' },
  ],
});

describe('cart store', () => {
  it('starts empty', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    expect(cart.read()).toEqual([]);
  });

  it('adds lines and merges repeats of the same drink with the same customisations', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    cart.add(signature);
    cart.add(matcha);
    cart.add({ ...signature, quantity: 2 });
    expect(cart.read()).toEqual([{ ...signature, quantity: 3 }, matcha]);
  });

  it('keeps the same drink with different customisations as separate lines', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    cart.add(signature);
    cart.add(signatureLessIce);
    expect(cart.read()).toHaveLength(2);
  });

  it('removes a line when its quantity is set to zero', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    cart.add(signature);
    cart.add(matcha);
    cart.setQuantity('signature-milk-tea', 0);
    expect(cart.read().map((line) => line.itemId)).toEqual(['matcha-latte']);
  });

  it('changes a quantity by line key', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    cart.add(signature);
    cart.add(signatureLessIce);
    cart.setQuantity('signature-milk-tea|Sugar=100%;Ice=Less ice', 4);
    expect(cart.read().map((line) => line.quantity)).toEqual([1, 4]);
  });

  it('replaces every line and clears', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    cart.add(signature);
    cart.replace([
      { itemId: 'x', name: 'X', unitPriceCents: 100, quantity: 3, customisations: [] },
    ]);
    expect(cart.read().map((line) => line.itemId)).toEqual(['x']);
    cart.clear();
    expect(cart.read()).toEqual([]);
  });

  it('persists to storage and reads back through a fresh store', () => {
    const storage = createMemoryStorage();
    createLocalStores(storage).cart.add(signature);
    expect(createLocalStores(storage).cart.read()[0]?.name).toBe('Signature Milk Tea');
  });

  it('resets corrupt JSON instead of crashing', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORAGE_KEYS.cart, '{not json');
    const { cart } = createLocalStores(storage);
    expect(cart.read()).toEqual([]);
    expect(storage.getItem(STORAGE_KEYS.cart)).toBeNull();
  });

  it('resets data that fails the schema', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORAGE_KEYS.cart, JSON.stringify([{ itemId: 'x', quantity: -1 }]));
    expect(createLocalStores(storage).cart.read()).toEqual([]);
  });

  it('rejects an invalid line on add', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    expect(() => cart.add({ ...signature, quantity: 0 })).toThrow();
  });

  it('notifies subscribers on every write and stops after unsubscribe', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    const listener = vi.fn();
    const unsubscribe = cart.subscribe(listener);
    cart.add(signature);
    cart.setQuantity('signature-milk-tea', 2);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    cart.clear();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('returns the same reference until something changes', () => {
    const { cart } = createLocalStores(createMemoryStorage());
    cart.add(signature);
    expect(cart.read()).toBe(cart.read());
  });
});

describe('orders store', () => {
  const lines = [{ ...signature, quantity: 2 }];
  const now = new Date('2026-09-24T02:00:00.000Z');

  it('places a valid received order with the right total and a pickup code', () => {
    const { orders } = createLocalStores(createMemoryStorage());
    const order = orders.place(lines, 'calamvale-central', now);
    expect(OrderSchema.safeParse(order).success).toBe(true);
    expect(order.status).toBe('received');
    expect(order.totalCents).toBe(1500);
    expect(order.pickupCode).toMatch(/^[A-Z0-9]{4}$/);
    expect(order.placedAt).toBe('2026-09-24T02:00:00.000Z');
    expect(order.storeId).toBe('calamvale-central');
  });

  it('lists newest first', () => {
    const { orders } = createLocalStores(createMemoryStorage());
    const first = orders.place(lines, 's', new Date('2026-09-24T01:00:00.000Z'));
    const second = orders.place(lines, 's', new Date('2026-09-24T02:00:00.000Z'));
    expect(orders.read().map((order) => order.id)).toEqual([second.id, first.id]);
  });

  it('updates status and updatedAt', () => {
    const { orders } = createLocalStores(createMemoryStorage());
    const order = orders.place(lines, 's', now);
    orders.setStatus(order.id, 'ready', new Date('2026-09-24T02:01:00.000Z'));
    expect(orders.read()[0]).toMatchObject({
      status: 'ready',
      updatedAt: '2026-09-24T02:01:00.000Z',
    });
  });

  it('refuses to place an empty order', () => {
    const { orders } = createLocalStores(createMemoryStorage());
    expect(() => orders.place([], 's', now)).toThrow();
  });
});

describe('account store', () => {
  const account = {
    displayName: 'Tristan',
    marketingOptIn: false,
    createdAt: '2026-09-24T02:00:00.000Z',
  };

  it('is null until saved, then reads back', () => {
    const storage = createMemoryStorage();
    const { account: store } = createLocalStores(storage);
    expect(store.read()).toBeNull();
    store.save(account);
    expect(createLocalStores(storage).account.read()).toEqual(account);
  });

  it('clears', () => {
    const { account: store } = createLocalStores(createMemoryStorage());
    store.save(account);
    store.clear();
    expect(store.read()).toBeNull();
  });
});
