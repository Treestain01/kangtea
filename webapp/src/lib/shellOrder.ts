import type { Order, ShellMessage, Store } from '@bbt/shared';
import type { ProgressSchedule } from '../store/orderProgress';

/**
 * What the iOS shell needs to know about the active order for its Live Activity: the status, the
 * first drink, where to collect it, and when the kitchen schedule says it will be ready.
 * No active order means the activity ends.
 */
export function shellOrderMessage(
  order: Order | null,
  store: Store | null,
  schedule: ProgressSchedule,
): ShellMessage {
  if (
    !order ||
    (order.status !== 'received' && order.status !== 'making' && order.status !== 'ready')
  ) {
    return { type: 'orderEnded' };
  }
  const placedAt = Date.parse(order.placedAt);
  return {
    type: 'orderStatus',
    status: order.status,
    itemName: order.lines[0]?.name ?? 'Your drink',
    storeName: store?.shortName ?? 'Kang Tea',
    placedAt: new Date(placedAt).toISOString(),
    readyAt: new Date(placedAt + schedule.readyAfterMs).toISOString(),
  };
}
