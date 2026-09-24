import type { Order } from '@bbt/shared';
import { formatPrice } from '../../lib/money';
import { summariseCustomisations } from '../../store/lines';
import './home.css';

type UsualCardProps = {
  order: Order;
  onReorder: (order: Order) => void;
};

/** "Your usual": the most recent collected order, one tap to order it again. The one filled card on Home. */
export function UsualCard({ order, onReorder }: UsualCardProps) {
  const [first, ...others] = order.lines;
  if (!first) return null;
  const name = others.length > 0 ? `${first.name} + ${others.length} more` : first.name;
  const summary = summariseCustomisations(first);

  return (
    <section className="usual" aria-labelledby="usual-heading">
      <div className="usual__text">
        <p className="usual__eyebrow" id="usual-heading">
          Your usual
        </p>
        <p className="usual__name">{name}</p>
        {summary && <p className="usual__spec">{summary}</p>}
      </div>
      <button type="button" className="usual__btn" onClick={() => onReorder(order)}>
        Reorder · {formatPrice(order.totalCents)}
      </button>
    </section>
  );
}
