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
};

/** One drink on the menu. Tap anywhere on it to customise and add. */
export function DrinkCard({ item, onOpen }: DrinkCardProps) {
  const tag = item.tags[0];
  const artStyle = { '--tea': item.colour } as CSSProperties;
  return (
    <article className="drink" aria-labelledby={`drink-${item.id}-name`}>
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
        <CupIllustration colour={item.colour} pearls={item.pearls} size={110} />
      </div>
      <h3 className="drink__name" id={`drink-${item.id}-name`}>
        {item.name}
      </h3>
      {item.description && <p className="drink__description">{item.description}</p>}
      <div className="drink__meta">
        <p className="drink__price">{formatPrice(item.priceCents)}</p>
        {onOpen && (
          <span className="drink__hint" aria-hidden="true">
            Customise
          </span>
        )}
      </div>
    </article>
  );
}
