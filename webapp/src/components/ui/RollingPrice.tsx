import type { CSSProperties } from 'react';
import { formatPrice } from '../../lib/money';
import './RollingPrice.css';

type RollingPriceProps = {
  cents: number;
};

/**
 * A price whose digits roll like an odometer when it changes. The real text stays in the DOM, one
 * character per span, so copy, search and assistive technology read the price as written; each
 * digit's visible face is a strip of 0 to 9 slid into place by CSS.
 */
export function RollingPrice({ cents }: RollingPriceProps) {
  const text = formatPrice(cents);
  return (
    <span className="roll">
      {[...text].map((character, index) =>
        /\d/.test(character) ? (
          <span key={index} className="roll__digit" style={{ '--d': character } as CSSProperties}>
            <span className="roll__real">{character}</span>
          </span>
        ) : (
          <span key={index}>{character}</span>
        ),
      )}
    </span>
  );
}
