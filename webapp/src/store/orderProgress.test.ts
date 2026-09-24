import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startOrderProgress } from './orderProgress';
import { createTestStores } from './testing';

const lines = [{ itemId: 'a', name: 'A', unitPriceCents: 700, quantity: 1, customisations: [] }];
const schedule = { makingAfterMs: 20_000, readyAfterMs: 60_000 };

describe('startOrderProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances a fresh order to making at 20s and ready at 60s', () => {
    const { orders } = createTestStores();
    const stop = startOrderProgress(orders, schedule);
    orders.place(lines, 's', new Date());

    vi.advanceTimersByTime(19_999);
    expect(orders.read()[0]?.status).toBe('received');
    vi.advanceTimersByTime(1);
    expect(orders.read()[0]?.status).toBe('making');
    vi.advanceTimersByTime(39_999);
    expect(orders.read()[0]?.status).toBe('making');
    vi.advanceTimersByTime(1);
    expect(orders.read()[0]?.status).toBe('ready');
    stop();
  });

  it('catches up an order placed before it started', () => {
    const { orders } = createTestStores();
    orders.place(lines, 's', new Date(Date.now() - 25_000));
    const stop = startOrderProgress(orders, schedule);
    expect(orders.read()[0]?.status).toBe('making');
    vi.advanceTimersByTime(35_000);
    expect(orders.read()[0]?.status).toBe('ready');
    stop();
  });

  it('leaves a ready order alone until the customer collects it', () => {
    const { orders } = createTestStores();
    const order = orders.place(lines, 's', new Date(Date.now() - 120_000));
    const stop = startOrderProgress(orders, schedule);
    expect(orders.read()[0]?.status).toBe('ready');
    vi.advanceTimersByTime(600_000);
    expect(orders.read()[0]?.status).toBe('ready');
    orders.setStatus(order.id, 'collected');
    vi.advanceTimersByTime(600_000);
    expect(orders.read()[0]?.status).toBe('collected');
    stop();
  });

  it('ignores finished orders', () => {
    const { orders } = createTestStores();
    const order = orders.place(lines, 's', new Date());
    orders.setStatus(order.id, 'cancelled');
    const stop = startOrderProgress(orders, schedule);
    vi.advanceTimersByTime(120_000);
    expect(orders.read()[0]?.status).toBe('cancelled');
    stop();
  });

  it('stops advancing after stop is called', () => {
    const { orders } = createTestStores();
    const stop = startOrderProgress(orders, schedule);
    orders.place(lines, 's', new Date());
    stop();
    vi.advanceTimersByTime(120_000);
    expect(orders.read()[0]?.status).toBe('received');
  });
});
