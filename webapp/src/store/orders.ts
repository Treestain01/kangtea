import { orderLinesTotalCents, type Order, type OrderLine, type OrderStatus } from '@bbt/shared';

const ACTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set(['received', 'making', 'ready']);

export function isActiveStatus(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

/** The order currently being made or waiting for pickup. At most one at a time. */
export function activeOrder(orders: readonly Order[]): Order | null {
  return orders.find((order) => isActiveStatus(order.status)) ?? null;
}

/** Collected and cancelled orders, newest first. */
export function pastOrders(orders: readonly Order[]): Order[] {
  return orders
    .filter((order) => !isActiveStatus(order.status))
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export const cartTotalCents = orderLinesTotalCents;

/** "2 × Signature Milk Tea, 1 × Matcha Latte" */
export function summariseLines(lines: readonly OrderLine[]): string {
  return lines.map((line) => `${line.quantity} × ${line.name}`).join(', ');
}

/** Total number of drinks across lines. */
export function countDrinks(lines: readonly OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
