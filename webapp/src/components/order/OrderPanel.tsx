import type { Order } from '@bbt/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useCatalogue } from '../../api/useCatalogue';
import { useStoreInfo } from '../../api/useStoreInfo';
import { KITCHEN_SCHEDULE } from '../../config';
import { formatPrice } from '../../lib/money';
import { useLoyalty } from '../../loyalty/LoyaltyProvider';
import { useStores } from '../../store/StoresProvider';
import { useCart, useOrders } from '../../store/hooks';
import { lineKey, summariseCustomisations } from '../../store/lines';
import { activeOrder, cartTotalCents } from '../../store/orders';
import type { CartLine } from '../../store/types';
import { StaticCup } from '../cup/StaticCup';
import { PRODUCT_COLOURS } from '../cup/cupParts';
import { flyPearl, tap } from '../cup/fly';
import { cue } from '../../lib/sounds';
import { LoyaltyCard } from '../loyalty/LoyaltyCard';
import { RollingPrice } from '../ui/RollingPrice';
import { CartLineRow, type LineArt } from './CartLineRow';
import { OrderStatusSteps } from './OrderStatusSteps';
import './OrderPanel.css';

const STATUS_COPY: Record<Order['status'], string> = {
  received: "We've got your order and it's in the queue.",
  making: 'Your drinks are being made.',
  ready: 'Ready! Show this code at the counter.',
  collected: 'Enjoy.',
  cancelled: 'This order was cancelled.',
};

/** The countdown ring's circumference, for r=88 in a 190 box. */
const RING_LENGTH = 2 * Math.PI * 88;
/** How often the countdown redraws while the kitchen works. */
const ETA_TICK_MS = 250;

/** "1:05" from milliseconds, rounding up so the last second still reads 0:01. */
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The current time, refreshed every `intervalMs`; frozen when null. */
function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

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
  const store = useStoreInfo();
  const loyalty = useLoyalty();
  const { catalogue } = useCatalogue();
  const kitchenCupRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const className = `order${compact ? ' order--compact' : ''}`;
  // The menu still knowing the drink gives the line its cup; a retired drink shows without one.
  const artFor = (itemId: string): LineArt | undefined => {
    if (catalogue.kind !== 'ready') return undefined;
    const item = catalogue.menu.items.find((candidate) => candidate.id === itemId);
    return item ? { colour: item.colour, pearls: item.pearls } : undefined;
  };

  // The next stamp still to earn on the strip, where the pearl lands.
  const nextStamp = (): Element | null => {
    if (loyalty.state.kind !== 'ready') return null;
    const stamps = stripRef.current?.querySelectorAll('.pearls__stamp');
    return stamps?.[loyalty.state.card.stamps.length] ?? null;
  };

  const collect = async (order: Order) => {
    tap();
    // Stamps are a bonus: a failed call must never block collecting the drink.
    void loyalty.earnFromOrder(order).catch(() => undefined);
    const target = nextStamp();
    const flight =
      kitchenCupRef.current && target
        ? flyPearl(kitchenCupRef.current, target, PRODUCT_COLOURS.pearl)
        : null;
    if (flight) await flight;
    if (target) cue('pearl');
    ordersStore.setStatus(order.id, 'collected');
  };

  return (
    <>
      {active ? (
        <ActiveOrderView
          className={className}
          compact={compact}
          order={active}
          artFor={artFor}
          cupRef={kitchenCupRef}
          onCollect={() => void collect(active)}
          onCancel={() => ordersStore.setStatus(active.id, 'cancelled')}
        />
      ) : (
        <CartView
          className={className}
          compact={compact}
          lines={cart}
          artFor={artFor}
          canPlace={store !== null && cart.length > 0}
          onChangeQuantity={(key, quantity) => cartStore.setQuantity(key, quantity)}
          onRemove={(key) => cartStore.setQuantity(key, 0)}
          onPlace={() => {
            if (!store) return;
            ordersStore.place(cart, store.id);
            cartStore.clear();
          }}
        />
      )}
      <div ref={stripRef} className={`order__pearls${compact ? ' order__pearls--compact' : ''}`}>
        <LoyaltyCard compact />
      </div>
    </>
  );
}

type CartViewProps = {
  className: string;
  compact: boolean;
  lines: CartLine[];
  artFor: (itemId: string) => LineArt | undefined;
  canPlace: boolean;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onPlace: () => void;
};

function CartView({
  className,
  compact,
  lines,
  artFor,
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
          <span className="order__cup" aria-hidden="true">
            <StaticCup colour={PRODUCT_COLOURS.tea} level={0} lid={false} />
          </span>
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
            key={lineKey(line)}
            line={line}
            art={artFor(line.itemId)}
            compact={compact}
            onChangeQuantity={onChangeQuantity}
            onRemove={onRemove}
          />
        ))}
      </ul>
      <div className="order__summary">
        <p className="order__total">
          <span>Total</span>
          <RollingPrice cents={cartTotalCents(lines)} />
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
  compact: boolean;
  order: Order;
  artFor: (itemId: string) => LineArt | undefined;
  cupRef: React.RefObject<HTMLDivElement | null>;
  onCollect: () => void;
  onCancel: () => void;
};

function ActiveOrderView({
  className,
  compact,
  order,
  artFor,
  cupRef,
  onCollect,
  onCancel,
}: ActiveOrderViewProps) {
  const first = order.lines[0];
  const firstArt = first ? artFor(first.itemId) : undefined;
  const now = useNow(order.status === 'ready' ? null : ETA_TICK_MS);
  const elapsed = now - Date.parse(order.placedAt);
  const progress =
    order.status === 'ready'
      ? 1
      : Math.min(1, Math.max(0, elapsed / KITCHEN_SCHEDULE.readyAfterMs));
  const remaining = Math.max(0, KITCHEN_SCHEDULE.readyAfterMs - elapsed);
  return (
    <section className={className} aria-labelledby="order-heading">
      <h2 id="order-heading" className="order__heading">
        Your order
      </h2>
      {first && firstArt && (
        <div className={`kitchen${compact ? ' kitchen--compact' : ''}`}>
          <div className="kitchen__ring">
            <svg className="kitchen__dial" viewBox="0 0 190 190" aria-hidden="true">
              <circle className="kitchen__track" cx="95" cy="95" r="88" />
              <circle
                className="kitchen__fill"
                cx="95"
                cy="95"
                r="88"
                style={{ strokeDashoffset: RING_LENGTH * (1 - progress) }}
              />
            </svg>
            <div className="kitchen__cup" ref={cupRef}>
              <StaticCup
                colour={firstArt.colour}
                pearls={firstArt.pearls}
                customisations={first.customisations}
                level={order.status === 'received' ? 0 : 1}
                lid={order.status === 'ready'}
                drop
                label={`${first.name} in the kitchen`}
              />
            </div>
          </div>
          <p className="kitchen__eta">
            {order.status === 'ready'
              ? 'Ready to collect'
              : `Ready in ${formatCountdown(remaining)}`}
          </p>
        </div>
      )}
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
          <li key={lineKey(line)} className="order__recapline">
            {artFor(line.itemId) && (
              <span className="order__recapart">
                <StaticCup
                  colour={artFor(line.itemId)?.colour ?? ''}
                  pearls={artFor(line.itemId)?.pearls}
                  customisations={line.customisations}
                />
              </span>
            )}
            <span className="order__recaptext">
              {line.quantity} × {line.name}
              {summariseCustomisations(line) && (
                <span className="order__recapoptions"> ({summariseCustomisations(line)})</span>
              )}
            </span>
            <span>{formatPrice(line.unitPriceCents * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="order__summary">
        <p className="order__total">
          <span>Total</span>
          <RollingPrice cents={order.totalCents} />
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
