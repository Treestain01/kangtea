import type { MenuItem } from '@bbt/shared';
import { useEffect, type CSSProperties } from 'react';
import { formatPrice } from '../../lib/money';
import { StaticCup } from '../cup/StaticCup';
import { cupPropsFor, usePour } from '../cup/usePour';
import './home.css';

type CupOfTheDayProps = {
  item: MenuItem;
  /** Opens the customise sheet on the drink. */
  onOpen: (item: MenuItem) => void;
};

/** How long after Home appears the cup starts pouring. */
const FIRST_POUR_DELAY_MS = 400;

/** One drink from the board, pouring itself when Home opens. A different one each day. */
export function CupOfTheDay({ item, onOpen }: CupOfTheDayProps) {
  const { phase, pouring, pour } = usePour();

  useEffect(() => {
    const timer = setTimeout(() => pour(() => undefined), FIRST_POUR_DELAY_MS);
    return () => clearTimeout(timer);
    // Pours once on arrival; a new drink tomorrow mounts a new card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <section className="cotd" aria-labelledby="cotd-heading">
      <div className="cotd__art" style={{ '--tea': item.colour } as CSSProperties}>
        <span className="cotd__cup">
          <StaticCup
            colour={item.colour}
            pearls={item.pearls}
            garnish={item.garnish}
            {...cupPropsFor(phase)}
          />
        </span>
      </div>
      <div className="cotd__text">
        <p className="cotd__eyebrow" id="cotd-heading">
          Cup of the day
        </p>
        <p className="cotd__name">{item.name}</p>
        {item.description && <p className="cotd__description">{item.description}</p>}
        <div className="cotd__actions">
          <button type="button" className="cotd__btn" onClick={() => onOpen(item)}>
            Build it · {formatPrice(item.priceCents)}
          </button>
          <button
            type="button"
            className="cotd__btn cotd__btn--quiet"
            disabled={pouring}
            onClick={() => pour(() => undefined)}
          >
            Pour again
          </button>
        </div>
      </div>
    </section>
  );
}
