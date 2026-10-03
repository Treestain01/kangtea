import type { Order } from '@bbt/shared';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCatalogue } from '../api/useCatalogue';
import { StaticCup } from '../components/cup/StaticCup';
import { PRODUCT_COLOURS } from '../components/cup/cupParts';
import { flyCup } from '../components/cup/fly';
import { cupPropsFor, usePour } from '../components/cup/usePour';
import type { LineArt } from '../components/order/CartLineRow';
import { formatPrice } from '../lib/money';
import { cue } from '../lib/sounds';
import { useStores } from '../store/StoresProvider';
import { useOrders } from '../store/hooks';
import { pastOrders, summariseLines } from '../store/orders';
import './HistoryPage.css';

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

const STATUS_LABEL: Partial<Record<Order['status'], string>> = {
  collected: 'Collected',
  cancelled: 'Cancelled',
};

/** How many of an order's drinks are drawn as cups before the rest become a count. */
const CUPS_SHOWN = 3;

/** Past orders, newest first, each drawn as its cups with a one tap reorder that pours them again. */
export function HistoryPage() {
  const { cart } = useStores();
  const orders = useOrders();
  const navigate = useNavigate();
  const { catalogue } = useCatalogue();
  const past = pastOrders(orders);

  const artFor = (itemId: string): LineArt | undefined => {
    if (catalogue.kind !== 'ready') return undefined;
    const item = catalogue.menu.items.find((candidate) => candidate.id === itemId);
    return item ? { colour: item.colour, pearls: item.pearls } : undefined;
  };

  const reorder = (order: Order) => {
    cart.replace(order.lines);
    void navigate('/order');
  };

  return (
    <section className="history" aria-labelledby="history-heading">
      <h2 id="history-heading" className="history__heading">
        History
      </h2>
      {past.length === 0 ? (
        <div className="history__empty">
          <span className="history__cup" aria-hidden="true">
            <StaticCup colour={PRODUCT_COLOURS.tea} level={0} lid={false} />
          </span>
          <p>No orders yet.</p>
          <Link to="/" className="history__link">
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="history__list" aria-label="Past orders">
          {past.map((order) => (
            <li key={order.id}>
              <PastOrder order={order} artFor={artFor} onReorder={reorder} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type PastOrderProps = {
  order: Order;
  artFor: (itemId: string) => LineArt | undefined;
  onReorder: (order: Order) => void;
};

/** One past order: when it was, its drinks as cups, the summary, the total and Order again. */
function PastOrder({ order, artFor, onReorder }: PastOrderProps) {
  const { phase, pouring, pour } = usePour();
  const cupsRef = useRef<HTMLDivElement>(null);
  // One cup per drink, so two of the same line are two cups.
  const drinks = order.lines.flatMap((line) =>
    Array.from({ length: line.quantity }, (_, n) => ({ line, art: artFor(line.itemId), n })),
  );
  const shown = drinks.filter((drink) => drink.art).slice(0, CUPS_SHOWN);
  const hidden = drinks.length - shown.length;

  const again = () => {
    if (shown.length === 0) {
      onReorder(order);
      return;
    }
    pour(() => {
      cue('lid');
      const flight = cupsRef.current ? flyCup(cupsRef.current) : null;
      if (flight) return flight.then(() => onReorder(order));
      onReorder(order);
    });
    if (!pouring) cue('pour');
  };

  return (
    <article className="pastorder" aria-labelledby={`pastorder-${order.id}`}>
      <div className="pastorder__head">
        <time id={`pastorder-${order.id}`} dateTime={order.placedAt}>
          {dateFormat.format(new Date(order.placedAt))}
        </time>
        <span className={`pastorder__status pastorder__status--${order.status}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>
      {shown.length > 0 && (
        <div className="pastorder__cups" ref={cupsRef} aria-hidden="true">
          {shown.map(({ line, art, n }) => (
            <span key={`${line.itemId}-${n}`} className="pastorder__cup">
              <StaticCup
                colour={art?.colour ?? PRODUCT_COLOURS.tea}
                pearls={art?.pearls}
                customisations={line.customisations}
                {...cupPropsFor(phase)}
              />
            </span>
          ))}
          {hidden > 0 && <span className="pastorder__more">+{hidden} more</span>}
        </div>
      )}
      <p className="pastorder__lines">{summariseLines(order.lines)}</p>
      <div className="pastorder__foot">
        <span className="pastorder__total">
          {formatPrice(order.totalCents)}
          {order.freeDrink && <span className="pastorder__free"> · free drink used</span>}
        </span>
        <button type="button" className="pastorder__again" disabled={pouring} onClick={again}>
          {pouring ? 'Pouring' : 'Order again'}
        </button>
      </div>
    </article>
  );
}
