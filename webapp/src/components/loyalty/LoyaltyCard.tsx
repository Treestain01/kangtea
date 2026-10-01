import { STAMPS_PER_CARD, type LoyaltyCard as LoyaltyCardData } from '@bbt/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../api/client';
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
 * shows the stamps earned on the current card in the colours of the drinks that earned them.
 */
export function LoyaltyCard({ heading = 'Your pearls', compact = false }: LoyaltyCardProps) {
  const loyalty = useLoyalty();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [message, setMessage] = useState('');

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

  const redeem = async () => {
    setBusy(true);
    setFailure('');
    try {
      await loyalty.redeem();
      setConfirming(false);
      setMessage('Free drink used. Enjoy.');
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <section className="pearls pearls--compact" aria-label={heading}>
        <div className="pearls__head">
          <p className="pearls__heading">{heading}</p>
          <p className="pearls__count">
            {card.complete ? 'Card full' : `${card.stamps.length} of ${STAMPS_PER_CARD}`}
          </p>
        </div>
        <Stamps card={card} />
      </section>
    );
  }

  return (
    <section className="pearls" aria-labelledby="pearls-heading">
      <div className="pearls__head">
        <h3 id="pearls-heading" className="pearls__heading">
          {heading}
        </h3>
        <p className="pearls__count">
          {card.complete ? 'Card full' : `${card.stamps.length} of ${STAMPS_PER_CARD}`}
        </p>
      </div>
      <Stamps card={card} />
      <p className="pearls__copy">
        {card.complete
          ? card.available > 1
            ? `You have ${card.available} free drinks waiting. Show this card at the counter.`
            : 'Your next drink is free. Show this card at the counter.'
          : `${STAMPS_PER_CARD - card.stamps.length} more to a free drink.`}
      </p>
      {card.complete &&
        (confirming ? (
          <div className="pearls__confirm" role="group" aria-label="Confirm using your free drink">
            <p className="pearls__copy">
              Only do this at the counter, when your drink is being made.
            </p>
            <div className="pearls__actions">
              <button
                type="button"
                className="pearls__action"
                disabled={busy}
                onClick={() => void redeem()}
              >
                Yes, use it now
              </button>
              <button
                type="button"
                className="pearls__action pearls__action--quiet"
                onClick={() => setConfirming(false)}
              >
                Not yet
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="pearls__action" onClick={() => setConfirming(true)}>
            Use my free drink
          </button>
        ))}
      {failure && (
        <p className="pearls__error" role="alert">
          {failure}
        </p>
      )}
      <p className="visually-hidden" role="status">
        {message}
      </p>
    </section>
  );
}

/** The row of ten stamps. New stamps scale in; the tenth wobbles when the card fills. */
function Stamps({ card }: { card: LoyaltyCardData }) {
  const seen = useRef<Set<string>>(new Set());
  const fresh = card.stamps.filter((stamp) => !seen.current.has(stamp.id)).map((s) => s.id);
  useEffect(() => {
    card.stamps.forEach((stamp) => seen.current.add(stamp.id));
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
