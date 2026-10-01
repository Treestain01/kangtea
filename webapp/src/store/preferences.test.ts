import { describe, expect, it } from 'vitest';
import { createLocalStores, STORAGE_KEYS } from './local';
import { createMemoryStorage, createTestStores } from './testing';

describe('preferences store', () => {
  it('defaults to following the system theme', () => {
    expect(createTestStores().preferences.read()).toEqual({
      theme: 'system',
      sounds: false,
      eveningMode: false,
    });
  });

  it('persists a saved theme under its own key and notifies subscribers', () => {
    const storage = createMemoryStorage();
    const stores = createLocalStores(storage);
    let notified = 0;
    stores.preferences.subscribe(() => {
      notified += 1;
    });

    stores.preferences.save({ theme: 'dark' });

    expect(notified).toBe(1);
    expect(stores.preferences.read()).toEqual({ theme: 'dark', sounds: false, eveningMode: false });
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.preferences) ?? '{}')).toEqual({
      theme: 'dark',
      sounds: false,
      eveningMode: false,
    });
    expect(createLocalStores(storage).preferences.read()).toEqual({
      theme: 'dark',
      sounds: false,
      eveningMode: false,
    });
  });

  it('rejects an unknown theme', () => {
    const stores = createTestStores();
    expect(() => stores.preferences.save({ theme: 'sepia' as never })).toThrow();
    expect(stores.preferences.read()).toEqual({
      theme: 'system',
      sounds: false,
      eveningMode: false,
    });
  });

  it('falls back to the defaults when stored data is corrupt', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORAGE_KEYS.preferences, '{"theme":"neon"}');
    expect(createLocalStores(storage).preferences.read()).toEqual({
      theme: 'system',
      sounds: false,
      eveningMode: false,
    });
    expect(storage.getItem(STORAGE_KEYS.preferences)).toBeNull();
  });

  it('survives clearing the session, cart and orders', () => {
    const stores = createTestStores();
    stores.preferences.save({ theme: 'light' });
    stores.cart.clear();
    stores.orders.clear();
    stores.session.clear();
    expect(stores.preferences.read()).toEqual({
      theme: 'light',
      sounds: false,
      eveningMode: false,
    });
  });
});
