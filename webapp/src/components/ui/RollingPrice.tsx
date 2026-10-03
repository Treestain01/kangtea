import { formatPrice } from '../../lib/money';
import './RollingPrice.css';

type RollingPriceProps = {
  cents: number;
};

/**
 * A price whose digits roll in when they change. The real text stays in the DOM, one character
 * per span, so copy, search and assistive technology read the price as written; a digit that
 * changes is remounted (its key carries the value) and its face rolls down into place.
 */
export function RollingPrice({ cents }: RollingPriceProps) {
  const text = formatPrice(cents);
  return (
    <span className="roll">
      {[...text].map((character, index) =>
        /\d/.test(character) ? (
          <span key={`${index}-${character}`} className="roll__digit" data-digit={character}>
            <span className="roll__real">{character}</span>
          </span>
        ) : (
          <span key={index}>{character}</span>
        ),
      )}
    </span>
  );
}
