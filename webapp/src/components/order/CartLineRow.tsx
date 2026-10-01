import { formatPrice } from '../../lib/money';
import { lineKey, summariseCustomisations } from '../../store/lines';
import type { CartLine } from '../../store/types';
import { StaticCup } from '../cup/StaticCup';
import './order.css';

/** Colour and pearls of the drink on the menu, for the mini cup. */
export type LineArt = { colour: string; pearls: boolean };

type CartLineRowProps = {
  line: CartLine;
  /** Draws the line as a small cup when the menu still has the drink. */
  art?: LineArt;
  /** Keeps the two row layout at every width, for the narrow desktop panel. */
  compact?: boolean;
  onChangeQuantity: (lineKey: string, quantity: number) => void;
  onRemove: (lineKey: string) => void;
};

/** One line in the cart: a mini cup of it, its customisations and quantity controls. Every control is a 44px target. */
export function CartLineRow({
  line,
  art,
  compact = false,
  onChangeQuantity,
  onRemove,
}: CartLineRowProps) {
  const key = lineKey(line);
  const summary = summariseCustomisations(line);
  return (
    <li className={`cartline${compact ? ' cartline--compact' : ''}`}>
      {art && (
        <div className="cartline__art">
          <StaticCup colour={art.colour} pearls={art.pearls} customisations={line.customisations} />
        </div>
      )}
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
