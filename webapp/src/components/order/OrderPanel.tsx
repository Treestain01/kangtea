import type { Order, Store } from '@bbt/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchStore } from '../../api/client';
import { formatPrice } from '../../lib/money';
import { useStores } from '../../store/StoresProvider';
import { useCart, useOrders } from '../../store/hooks';
import { activeOrder, cartTotalCents } from '../../store/orders';
import type { CartLine } from '../../store/types';
import { CartLineRow } from './CartLineRow';
import { OrderStatusSteps } from './OrderStatusSteps';
import './OrderPanel.css';

const STATUS_COPY: Record<Order['status'], string> = {
  received: "We've got your order and it's in the queue.",
  making: 'Your drinks are being made.',
  ready: 'Ready! Show this code at the counter.',
  collected: 'Enjoy.',
  cancelled: 'This order was cancelled.',
};

type OrderPanelProps = {
  /** Compact stacks every line for the narrow desktop side panel. */
  compact?: boolean;
};

/**
 * Your order: the cart until you place it, then the live status until you collect.
 * The Order page renders it full width on phones; the app shell renders it as the side panel on desktop.
 */
export function OrderPanel({ compact = false }: OrderPanelProps) {
  const { cart: cartStore, orders: ordersStore } = useStores();
  const cart = useCart();
  const orders = useOrders();
  const active = activeOrder(orders);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStore()
      .then((loaded) => {
        if (!cancelled) setStore(loaded);
      })
      .catch(() => {
        if (!cancelled) setStore(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const className = `order${compact ? ' order--compact' : ''}`;

  if (active) {
    return (
      <ActiveOrderView
        className={className}
        order={active}
        onCollect={() => ordersStore.setStatus(active.id, 'collected')}
        onCancel={() => ordersStore.setStatus(active.id, 'cancelled')}
      />
    );
  }

  return (
    <CartView
      className={className}
      compact={compact}
      lines={cart}
      canPlace={store !== null && cart.length > 0}
      onChangeQuantity={(itemId, quantity) => cartStore.setQuantity(itemId, quantity)}
      onRemove={(itemId) => cartStore.setQuantity(itemId, 0)}
      onPlace={() => {
        if (!store) return;
        ordersStore.place(cart, store.id);
        cartStore.clear();
      }}
    />
  );
}

type CartViewProps = {
  className: string;
  compact: boolean;
  lines: CartLine[];
  canPlace: boolean;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onPlace: () => void;
};

function CartView({
  className,
  compact,
  lines,
  canPlace,
  onChangeQuantity,
  onRemove,
  onPlace,
}: CartViewProps) {
  if (lines.length === 0) {
    return (
      <section className={className} aria-labelledby="order-heading">
        <h2 id="order-heading" className="order__heading">
          Your order
        </h2>
        <div className="order__empty">
          <p>Your order is empty.</p>
          {compact ? (
            <p className="order__hint">Add drinks from the menu and they will appear here.</p>
          ) : (
            <Link to="/" className="order__link">
              Browse the menu
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={className} aria-labelledby="order-heading">
      <h2 id="order-heading" className="order__heading">
        Your order
      </h2>
      <ul className="order__lines" aria-label="Drinks in your order">
        {lines.map((line) => (
          <CartLineRow
            key={line.itemId}
            line={line}
            compact={compact}
            onChangeQuantity={onChangeQuantity}
            onRemove={onRemove}
          />
        ))}
      </ul>
      <div className="order__summary">
        <p className="order__total">
          <span>Total</span>
          <span>{formatPrice(cartTotalCents(lines))}</span>
        </p>
        <p className="order__note">Pay at the counter when you collect.</p>
        <button type="button" className="order__primary" disabled={!canPlace} onClick={onPlace}>
          Place order
        </button>
      </div>
    </section>
  );
}

type ActiveOrderViewProps = {
  className: string;
  order: Order;
  onCollect: () => void;
  onCancel: () => void;
};

function ActiveOrderView({ className, order, onCollect, onCancel }: ActiveOrderViewProps) {
  return (
    <section className={className} aria-labelledby="order-heading">
      <h2 id="order-heading" className="order__heading">
        Your order
      </h2>
      <OrderStatusSteps status={order.status} />
      <p className="order__copy" role="status">
        {STATUS_COPY[order.status]}
      </p>
      {order.status === 'ready' && (
        <p
          className="order__code"
          aria-label={`Pickup code ${order.pickupCode.split('').join(' ')}`}
        >
          {order.pickupCode}
        </p>
      )}
      <ul className="order__recap" aria-label="Drinks in this order">
        {order.lines.map((line) => (
          <li key={line.itemId} className="order__recapline">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span>{formatPrice(line.unitPriceCents * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="order__summary">
        <p className="order__total">
          <span>Total</span>
          <span>{formatPrice(order.totalCents)}</span>
        </p>
        {order.status === 'ready' && (
          <button type="button" className="order__primary" onClick={onCollect}>
            I've picked it up
          </button>
        )}
        {order.status === 'received' && (
          <button type="button" className="order__secondary" onClick={onCancel}>
            Cancel order
          </button>
        )}
      </div>
    </section>
  );
}
