import type { Order } from '@bbt/shared';
import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../lib/money';
import { summariseCustomisations } from '../../store/lines';
import { StaticCup } from '../cup/StaticCup';
import { flyCup } from '../cup/fly';
import { cue } from '../../lib/sounds';
import './home.css';

type UsualCardProps = {
  order: Order;
  /** Colour and pearls of the first drink, when the menu still has it, for the cup. */
  art?: { colour: string; pearls: boolean };
  onReorder: (order: Order) => void;
};

/** The pour: empty the cup, fill it, drop the pieces, lid on, then fly it into the order. */
const POUR = { start: 50, lid: 750, fly: 400 } as const;

function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * "Your usual": the most recent collected order, one tap to order it again. The one filled card on Home.
 * Re-pour builds the saved drink in the card's cup and flies it into the order before the cart is filled;
 * without motion the reorder is immediate.
 */
export function UsualCard({ order, art, onReorder }: UsualCardProps) {
  const [pour, setPour] = useState<'rest' | 'empty' | 'filling' | 'done'>('rest');
  const cupRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const [first, ...others] = order.lines;
  if (!first) return null;
  const name = others.length > 0 ? `${first.name} + ${others.length} more` : first.name;
  const summary = summariseCustomisations(first);
  const pouring = pour !== 'rest';

  const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));

  const repour = () => {
    if (pouring) return;
    if (!art || !motionAllowed()) {
      onReorder(order);
      return;
    }
    setPour('empty');
    later(POUR.start, () => {
      setPour('filling');
      cue('pour');
    });
    later(POUR.start + POUR.lid, () => {
      setPour('done');
      cue('lid');
    });
    later(POUR.start + POUR.lid + POUR.fly, () => {
      const flight = cupRef.current ? flyCup(cupRef.current) : Promise.resolve();
      void flight.then(() => {
        onReorder(order);
        setPour('rest');
      });
    });
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
            level={pour === 'empty' ? 0 : 1}
            lid={pour === 'rest' || pour === 'done'}
            drop={pouring}
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
