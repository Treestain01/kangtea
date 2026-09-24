import type { Order } from '@bbt/shared';
import { Link, useNavigate } from 'react-router';
import { formatPrice } from '../lib/money';
import { useStores } from '../store/StoresProvider';
import { useOrders } from '../store/hooks';
import { pastOrders, summariseLines } from '../store/orders';
import './HistoryPage.css';

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

const STATUS_LABEL: Partial<Record<Order['status'], string>> = {
  collected: 'Collected',
  cancelled: 'Cancelled',
};

/** Past orders, newest first, each with a one tap reorder. */
export function HistoryPage() {
  const { cart } = useStores();
  const orders = useOrders();
  const navigate = useNavigate();
  const past = pastOrders(orders);

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
          <p>No orders yet.</p>
          <Link to="/" className="history__link">
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="history__list" aria-label="Past orders">
          {past.map((order) => (
            <li key={order.id}>
              <article className="pastorder" aria-labelledby={`pastorder-${order.id}`}>
                <div className="pastorder__head">
                  <time id={`pastorder-${order.id}`} dateTime={order.placedAt}>
                    {dateFormat.format(new Date(order.placedAt))}
                  </time>
                  <span className={`pastorder__status pastorder__status--${order.status}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
                <p className="pastorder__lines">{summariseLines(order.lines)}</p>
                <div className="pastorder__foot">
                  <span className="pastorder__total">{formatPrice(order.totalCents)}</span>
                  <button type="button" className="pastorder__again" onClick={() => reorder(order)}>
                    Order again
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
