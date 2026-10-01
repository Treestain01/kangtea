import type { Order } from '@bbt/shared';
import { useRef } from 'react';
import { formatPrice } from '../../lib/money';
import { cue } from '../../lib/sounds';
import { summariseCustomisations } from '../../store/lines';
import { StaticCup } from '../cup/StaticCup';
import { flyCup } from '../cup/fly';
import { cupPropsFor, usePour } from '../cup/usePour';
import './home.css';

type UsualCardProps = {
  order: Order;
  /** Colour and pearls of the first drink, when the menu still has it, for the cup. */
  art?: { colour: string; pearls: boolean };
  onReorder: (order: Order) => void;
};

/**
 * "Your usual": the most recent collected order, one tap to order it again. The one filled card on Home.
 * Re-pour builds the saved drink in the card's cup and flies it into the order before the cart is filled;
 * without motion the reorder is immediate.
 */
export function UsualCard({ order, art, onReorder }: UsualCardProps) {
  const { phase, pouring, pour } = usePour();
  const cupRef = useRef<HTMLDivElement>(null);

  const [first, ...others] = order.lines;
  if (!first) return null;
  const name = others.length > 0 ? `${first.name} + ${others.length} more` : first.name;
  const summary = summariseCustomisations(first);

  const repour = () => {
    if (!art) {
      onReorder(order);
      return;
    }
    pour(() => {
      cue('lid');
      const flight = cupRef.current ? flyCup(cupRef.current) : null;
      if (flight) return flight.then(() => onReorder(order));
      onReorder(order);
    });
    if (!pouring) cue('pour');
  };

  return (
    <section className="usual" aria-labelledby="usual-heading">
      <div className="usual__text">
        <p className="usual__eyebrow" id="usual-heading">
          Your usual
        </p>
        <p className="usual__name">{name}</p>
        {summary && <p className="usual__spec">{summary}</p>}
      </div>
      {art && (
        <div className="usual__art" ref={cupRef}>
          <StaticCup
            colour={art.colour}
            pearls={art.pearls}
            customisations={first.customisations}
            {...cupPropsFor(phase)}
          />
        </div>
      )}
      <button type="button" className="usual__btn" disabled={pouring} onClick={repour}>
        {pouring ? 'Pouring' : 'Re-pour'}{' '}
        <span className="usual__price">{formatPrice(order.totalCents)}</span>
      </button>
    </section>
  );
}
