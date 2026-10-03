import { STAMPS_PER_CARD, type LoyaltyCard as LoyaltyCardData } from '@bbt/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { rainPearls } from '../cup/celebrate';
import { PRODUCT_COLOURS } from '../cup/cupParts';
import { useLoyalty } from '../../loyalty/LoyaltyProvider';
import './LoyaltyCard.css';

type LoyaltyCardProps = {
  /** Headline over the stamps. */
  heading?: string;
  /** One row of ten small stamps with the count and no copy, for the order panel. Signed in only. */
  compact?: boolean;
};

/**
 * The pearl card: ten cups, the tenth free. Signed out it invites people to sign in; signed in it
 * shows the card being filled now in the colours of the drinks that earned its stamps, with a note
 * above it while a finished card waits to come off the next order (ADR 0023).
 */
export function LoyaltyCard({ heading = 'Your stamps', compact = false }: LoyaltyCardProps) {
  const loyalty = useLoyalty();
  const [flipped, setFlipped] = useState(false);

  // The moment the card fills in front of the person, pearls rain down it once.
  const frontRef = useRef<HTMLElement>(null);
  const complete = loyalty.state.kind === 'ready' && loyalty.state.card.complete;
  const wasComplete = useRef(complete);
  useEffect(() => {
    if (complete && !wasComplete.current && frontRef.current) void rainPearls(frontRef.current);
    wasComplete.current = complete;
  }, [complete]);

  if (compact && loyalty.state.kind !== 'ready') return null;

  if (loyalty.state.kind === 'signed-out') {
    return (
      <section className="pearls pearls--invite" aria-labelledby="pearls-heading">
        <h3 id="pearls-heading" className="pearls__heading">
          {heading}
        </h3>
        <p className="pearls__copy">
          Every drink earns a pearl. Collect ten and the next one is on us.
        </p>
        <Link to="/account" className="pearls__action">
          Sign in to start collecting
        </Link>
      </section>
    );
  }

  if (loyalty.state.kind === 'loading') {
    return (
      <section className="pearls" aria-labelledby="pearls-heading">
        <h3 id="pearls-heading" className="pearls__heading">
          {heading}
        </h3>
        <p className="pearls__copy" role="status">
          Counting your pearls
        </p>
      </section>
    );
  }

  if (loyalty.state.kind === 'error') {
    return (
      <section className="pearls" aria-labelledby="pearls-heading">
        <h3 id="pearls-heading" className="pearls__heading">
          {heading}
        </h3>
        <p className="pearls__copy" role="alert">
          We couldn't load your pearls. {loyalty.state.message}
        </p>
        <button type="button" className="pearls__action" onClick={() => void loyalty.refresh()}>
          Try again
        </button>
      </section>
    );
  }

  const { card } = loyalty.state;

  if (compact) {
    return (
      <section className="pearls pearls--compact" aria-label={heading}>
        <div className="pearls__head">
          <p className="pearls__heading">{heading}</p>
          <p className="pearls__count">
            {card.complete ? 'Free drink waiting' : `${card.stamps.length} of ${STAMPS_PER_CARD}`}
          </p>
        </div>
        <Stamps card={card} />
      </section>
    );
  }

  return (
    <div className={`pearls-flip${flipped ? ' pearls-flip--flipped' : ''}`}>
      <section
        className="pearls pearls__face"
        aria-labelledby="pearls-heading"
        inert={flipped}
        ref={frontRef}
      >
        {card.complete && (
          <p className="pearls__banner" role="status">
            {card.available > 1
              ? `You have ${card.available} free drinks to claim. One comes off each of your next orders.`
              : 'You have a free drink to claim. It comes off your next order.'}
            <span className="pearls__banner-note"> Toppings are still charged.</span>
          </p>
        )}
        <div className="pearls__head">
          <h3 id="pearls-heading" className="pearls__heading">
            {heading}
          </h3>
          <p className="pearls__count">
            {card.stamps.length} of {STAMPS_PER_CARD}
          </p>
        </div>
        <Stamps card={card} />
        <p className="pearls__copy">{STAMPS_PER_CARD - card.stamps.length} more to a free drink.</p>
        {card.stamps.length > 0 && (
          <button
            type="button"
            className="pearls__action pearls__action--quiet"
            onClick={() => setFlipped(true)}
          >
            See what filled the card
          </button>
        )}
      </section>
      <section
        className="pearls pearls__face pearls__face--back"
        aria-labelledby="pearls-back-heading"
        inert={!flipped}
      >
        <div className="pearls__head">
          <h3 id="pearls-back-heading" className="pearls__heading">
            Behind each stamp
          </h3>
          <p className="pearls__count">{card.stamps.length} earned</p>
        </div>
        <ol className="pearls__history" aria-label="Drinks that earned the stamps">
          {card.stamps.map((stamp, index) => (
            <li key={stamp.id} className="pearls__drink">
              <span
                className="pearls__swatch"
                aria-hidden="true"
                style={{ '--tea': stamp.colour } as React.CSSProperties}
              />
              <span>
                Stamp {index + 1} · {stamp.itemName}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="pearls__action pearls__action--quiet"
          onClick={() => setFlipped(false)}
        >
          Back to the card
        </button>
      </section>
    </div>
  );
}

/** The row of ten stamps. New stamps scale in; the tenth wobbles when the card fills. */
function Stamps({ card }: { card: LoyaltyCardData }) {
  // New stamps are the ones past the count last rendered (all of them when the card rolled over),
  // so a provisional stamp replaced by the server's does not pop twice.
  const previousCount = useRef(card.stamps.length);
  const from = card.stamps.length < previousCount.current ? 0 : previousCount.current;
  const fresh = card.stamps.slice(from).map((stamp) => stamp.id);
  useEffect(() => {
    previousCount.current = card.stamps.length;
  });
  const style = { '--pearl': PRODUCT_COLOURS.pearl } as React.CSSProperties;
  return (
    <ol className="pearls__stamps" aria-label="Stamps on this card" style={style}>
      {Array.from({ length: STAMPS_PER_CARD }, (_, index) => {
        const stamp = card.stamps[index];
        const last = index === STAMPS_PER_CARD - 1;
        const symbol = stamp ? (last ? 'kt-stamp-free' : 'kt-stamp-full') : 'kt-stamp-empty';
        const label = stamp
          ? last
            ? `Free drink unlocked by ${stamp.itemName}`
            : `${stamp.itemName}`
          : last
            ? 'Free drink, still to earn'
            : 'Still to earn';
        const className = `pearls__stamp${stamp && fresh.includes(stamp.id) ? ' pearls__stamp--new' : ''}${stamp && last && fresh.includes(stamp.id) ? ' pearls__stamp--unlock' : ''}`;
        return (
          <li key={stamp?.id ?? `empty-${index}`} className={className}>
            <svg
              viewBox="0 0 40 40"
              role="img"
              aria-label={label}
              style={stamp ? ({ '--tea': stamp.colour } as React.CSSProperties) : undefined}
            >
              <use href={`#${symbol}`} width="40" height="40" />
            </svg>
          </li>
        );
      })}
    </ol>
  );
}
