import type { Topping } from '@bbt/shared';
import type { CSSProperties } from 'react';
import { artForTopping, productColourVars } from './cupParts';
import './ToppingArt.css';

type ToppingArtProps = {
  topping: Topping;
};

/**
 * A topping drawn with the same symbol the live cup drops into the drink, so the token in the tray
 * and the piece in the cup are visibly the same thing. Decorative; the token's label carries meaning.
 */
export function ToppingArt({ topping }: ToppingArtProps) {
  const art = artForTopping(topping);
  const style = productColourVars() as CSSProperties;
  if (art.kind === 'cap') {
    const { symbol, width, height } = art.cap;
    return (
      <svg
        className="toppingart"
        viewBox={`0 0 ${width} ${height}`}
        style={style}
        aria-hidden="true"
      >
        <use href={`#${symbol}`} width={width} height={height} />
      </svg>
    );
  }
  const tint = art.kind === 'sink' ? art.tint : undefined;
  if (tint) Object.assign(style, { '--jelly': tint, '--popping': tint });
  return (
    <svg className="toppingart" viewBox="0 0 24 24" style={style} aria-hidden="true">
      <use href={`#${art.symbol}`} width="24" height="24" />
    </svg>
  );
}
