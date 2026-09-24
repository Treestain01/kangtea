import { formatPrice } from '../../lib/money';
import type { CartLine } from '../../store/types';
import './order.css';

type CartLineRowProps = {
  line: CartLine;
  /** Keeps the two row layout at every width, for the narrow desktop panel. */
  compact?: boolean;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
};

/** One line in the cart with quantity controls. Every control is a 44px target. */
export function CartLineRow({
  line,
  compact = false,
  onChangeQuantity,
  onRemove,
}: CartLineRowProps) {
  return (
    <li className={`cartline${compact ? ' cartline--compact' : ''}`}>
      <div className="cartline__info">
        <p className="cartline__name">{line.name}</p>
        <p className="cartline__unit">{formatPrice(line.unitPriceCents)} each</p>
      </div>
      <p className="cartline__total">{formatPrice(line.unitPriceCents * line.quantity)}</p>
      <div className="cartline__qty" role="group" aria-label={`Quantity of ${line.name}`}>
        <button
          type="button"
          className="cartline__step"
          aria-label={`Remove one ${line.name}`}
          onClick={() => onChangeQuantity(line.itemId, line.quantity - 1)}
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
          onClick={() => onChangeQuantity(line.itemId, line.quantity + 1)}
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="cartline__remove"
        aria-label={`Remove ${line.name}`}
        onClick={() => onRemove(line.itemId)}
      >
        Remove
      </button>
    </li>
  );
}
