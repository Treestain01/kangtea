import type { MenuItem, MenuItemTag } from '@bbt/shared';
import type { CSSProperties } from 'react';
import { formatPrice } from '../../lib/money';
import { CupIllustration } from './CupIllustration';
import './menu.css';

const TAG_LABELS: Record<MenuItemTag, string> = {
  'best-seller': 'Best seller',
  new: 'New',
};

type DrinkCardProps = {
  item: MenuItem;
  /** When provided, the whole card is a button that opens customisation for the item. */
  onOpen?: (item: MenuItem) => void;
  /** Compact cards sit in the home screen's swipe row: smaller art, no description. */
  variant?: 'default' | 'compact';
};

/** One drink on the menu. Tap anywhere on it to customise and add. */
export function DrinkCard({ item, onOpen, variant = 'default' }: DrinkCardProps) {
  const tag = item.tags[0];
  const compact = variant === 'compact';
  const artStyle = { '--tea': item.colour } as CSSProperties;
  return (
    <article
      className={`drink${compact ? ' drink--compact' : ''}`}
      aria-labelledby={`drink-${item.id}-name`}
    >
      {onOpen && (
        <button
          type="button"
          className="drink__cover"
          aria-label={`Customise ${item.name}`}
          onClick={() => onOpen(item)}
        />
      )}
      <div className="drink__art" style={artStyle}>
        {tag && <span className="drink__tag">{TAG_LABELS[tag]}</span>}
        <CupIllustration colour={item.colour} pearls={item.pearls} size={compact ? 76 : 110} />
      </div>
      <h3 className="drink__name" id={`drink-${item.id}-name`}>
        {item.name}
      </h3>
      {!compact && item.description && <p className="drink__description">{item.description}</p>}
      <div className="drink__meta">
        <p className="drink__price">{formatPrice(item.priceCents)}</p>
        {onOpen && !compact && (
          <span className="drink__hint" aria-hidden="true">
            Customise
          </span>
        )}
      </div>
    </article>
  );
}
