import { activeOrder } from './orders';
import type { OrdersStore } from './types';

export type ProgressSchedule = {
  /** Milliseconds after placedAt when the order becomes "making". */
  makingAfterMs: number;
  /** Milliseconds after placedAt when the order becomes "ready". */
  readyAfterMs: number;
};

export const DEFAULT_SCHEDULE: ProgressSchedule = {
  makingAfterMs: 20_000,
  readyAfterMs: 60_000,
};

/**
 * SIMULATED KITCHEN. This is the one fake behaviour in the product.
 *
 * Advances the active order received -> making -> ready on a schedule measured from placedAt,
 * so a reload resumes where it left off. Collection stays the customer's action.
 * When the API owns orders, this file is replaced by polling; nothing else changes.
 *
 * Returns a stop function.
 */
export function startOrderProgress(
  orders: OrdersStore,
  schedule: ProgressSchedule = DEFAULT_SCHEDULE,
  now: () => number = () => Date.now(),
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const tick = () => {
    clearTimer();
    const order = activeOrder(orders.read());
    if (!order) return;

    const elapsed = now() - Date.parse(order.placedAt);

    if (order.status === 'received') {
      if (elapsed >= schedule.makingAfterMs) {
        // setStatus notifies subscribers, which calls tick again for the next step.
        orders.setStatus(order.id, 'making', new Date(now()));
        return;
      }
      timer = setTimeout(tick, schedule.makingAfterMs - elapsed);
      return;
    }

    if (order.status === 'making') {
      if (elapsed >= schedule.readyAfterMs) {
        orders.setStatus(order.id, 'ready', new Date(now()));
        return;
      }
      timer = setTimeout(tick, schedule.readyAfterMs - elapsed);
    }
  };

  const unsubscribe = orders.subscribe(tick);
  tick();

  return () => {
    clearTimer();
    unsubscribe();
  };
}
