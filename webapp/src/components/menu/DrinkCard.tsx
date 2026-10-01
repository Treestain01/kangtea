import type { MenuItem, MenuItemTag } from '@bbt/shared';
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { formatPrice } from '../../lib/money';
import { StaticCup } from '../cup/StaticCup';
import './menu.css';

const TAG_LABELS: Record<MenuItemTag, string> = {
  'best-seller': 'Best seller',
  recommended: 'Recommended',
  new: 'New',
};

/** How far the cup leans, in degrees, when the pointer reaches the edge of the art. */
const TILT_X = 18;
const TILT_Y = 28;

type DrinkCardProps = {
  item: MenuItem;
  /** When provided, the whole card is a button that opens customisation for the item. */
  onOpen?: (item: MenuItem) => void;
  /** Compact cards sit in the home screen's swipe row: smaller art, no description. */
  variant?: 'default' | 'compact';
  /** Lit up, as the Surprise me spin passes over it. */
  highlighted?: boolean;
};

/** One drink on the menu, drawn as its cup. Tap anywhere on it to customise and add. */
export function DrinkCard({
  item,
  onOpen,
  variant = 'default',
  highlighted = false,
}: DrinkCardProps) {
  const tag = item.tags[0];
  const compact = variant === 'compact';
  const artRef = useRef<HTMLDivElement>(null);
  const artStyle = { '--tea': item.colour } as CSSProperties;

  // The cup leans toward the pointer. Written straight to the element: no render per move.
  const lean = (event: PointerEvent<HTMLElement>) => {
    const art = artRef.current;
    if (!art || event.pointerType === 'touch') return;
    const rect = art.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    art.style.setProperty('--rx', `${(-dy * TILT_X).toFixed(1)}deg`);
    art.style.setProperty('--ry', `${(dx * TILT_Y).toFixed(1)}deg`);
  };
  const settle = () => {
    artRef.current?.style.removeProperty('--rx');
    artRef.current?.style.removeProperty('--ry');
  };

  return (
    <article
      className={`drink${compact ? ' drink--compact' : ''}${highlighted ? ' drink--highlighted' : ''}`}
      aria-labelledby={`drink-${item.id}-name`}
      onPointerMove={lean}
      onPointerLeave={settle}
    >
      {onOpen && (
        <button
          type="button"
          className="drink__cover"
          aria-label={`Customise ${item.name}`}
          onClick={() => onOpen(item)}
        />
      )}
      <div className="drink__art" style={artStyle} ref={artRef}>
        {tag && <span className="drink__tag">{TAG_LABELS[tag]}</span>}
        <div className="drink__cup">
          <StaticCup colour={item.colour} pearls={item.pearls} />
        </div>
      </div>
      <h3 className="drink__name" id={`drink-${item.id}-name`}>
        {item.name}
      </h3>
      {!compact && item.description && <p className="drink__description">{item.description}</p>}
      <div className="drink__meta">
        <p className="drink__price">{formatPrice(item.priceCents)}</p>
        {onOpen && (
          <span className="drink__hint" aria-hidden="true">
            +
          </span>
        )}
      </div>
    </article>
  );
}
