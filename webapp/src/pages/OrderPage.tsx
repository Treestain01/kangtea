import type { Order, Store } from '@bbt/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { fetchStore } from '../api/client';
import { CartLineRow } from '../components/order/CartLineRow';
import { OrderStatusSteps } from '../components/order/OrderStatusSteps';
import { formatPrice } from '../lib/money';
import { useStores } from '../store/StoresProvider';
import { useCart, useOrders } from '../store/hooks';
import { activeOrder, cartTotalCents } from '../store/orders';
import type { CartLine } from '../store/types';
import './OrderPage.css';

const STATUS_COPY: Record<Order['status'], string> = {
  received: "We've got your order and it's in the queue.",
  making: 'Your drinks are being made.',
  ready: 'Ready! Show this code at the counter.',
  collected: 'Enjoy.',
  cancelled: 'This order was cancelled.',
};

/** Current Order: the cart until you place it, then the live status until you collect. */
export function OrderPage() {
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

  if (active) {
    return (
      <ActiveOrderView
        order={active}
        onCollect={() => ordersStore.setStatus(active.id, 'collected')}
        onCancel={() => ordersStore.setStatus(active.id, 'cancelled')}
      />
    );
  }

  return (
    <CartView
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
  lines: CartLine[];
  canPlace: boolean;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onPlace: () => void;
};

function CartView({ lines, canPlace, onChangeQuantity, onRemove, onPlace }: CartViewProps) {
  if (lines.length === 0) {
    return (
      <section className="order" aria-labelledby="order-heading">
        <h2 id="order-heading" className="order__heading">
          Your order
        </h2>
        <div className="order__empty">
          <p>Your order is empty.</p>
          <Link to="/" className="order__link">
            Browse the menu
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="order" aria-labelledby="order-heading">
      <h2 id="order-heading" className="order__heading">
        Your order
      </h2>
      <ul className="order__lines" aria-label="Drinks in your order">
        {lines.map((line) => (
          <CartLineRow
            key={line.itemId}
            line={line}
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
  order: Order;
  onCollect: () => void;
  onCancel: () => void;
};

function ActiveOrderView({ order, onCollect, onCancel }: ActiveOrderViewProps) {
  return (
    <section className="order" aria-labelledby="order-heading">
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
