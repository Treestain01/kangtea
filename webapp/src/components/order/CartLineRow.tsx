import { formatPrice } from '../../lib/money';
import { lineKey, summariseCustomisations } from '../../store/lines';
import type { CartLine } from '../../store/types';
import './order.css';

type CartLineRowProps = {
  line: CartLine;
  /** Keeps the two row layout at every width, for the narrow desktop panel. */
  compact?: boolean;
  onChangeQuantity: (lineKey: string, quantity: number) => void;
  onRemove: (lineKey: string) => void;
};

/** One line in the cart with its customisations and quantity controls. Every control is a 44px target. */
export function CartLineRow({
  line,
  compact = false,
  onChangeQuantity,
  onRemove,
}: CartLineRowProps) {
  const key = lineKey(line);
  const summary = summariseCustomisations(line);
  return (
    <li className={`cartline${compact ? ' cartline--compact' : ''}`}>
      <div className="cartline__info">
        <p className="cartline__name">{line.name}</p>
        {summary && <p className="cartline__options">{summary}</p>}
        <p className="cartline__unit">{formatPrice(line.unitPriceCents)} each</p>
      </div>
      <p className="cartline__total">{formatPrice(line.unitPriceCents * line.quantity)}</p>
      <div className="cartline__qty" role="group" aria-label={`Quantity of ${line.name}`}>
        <button
          type="button"
          className="cartline__step"
          aria-label={`Remove one ${line.name}`}
          onClick={() => onChangeQuantity(key, line.quantity - 1)}
        >
          −
        </button>
        <span className="cartline__count" aria-live="polite">
          {line.quantity}
        </span>
        <button
          type="button"
          className="cartline__step"
          aria-label={`Add one ${line.name}`}
          onClick={() => onChangeQuantity(key, line.quantity + 1)}
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="cartline__remove"
        aria-label={`Remove ${line.name}`}
        onClick={() => onRemove(key)}
      >
        Remove
      </button>
    </li>
  );
}
