import type { MenuItem, MenuItemTag } from '@bbt/shared';
import { formatPrice } from '../../lib/money';
import { CupIllustration } from './CupIllustration';
import './menu.css';

const TAG_LABELS: Record<MenuItemTag, string> = {
  'best-seller': 'Best seller',
  new: 'New',
};

type DrinkCardProps = {
  item: MenuItem;
  /** When provided, an Add button appears and calls this with the item. */
  onAdd?: (item: MenuItem) => void;
};

/** One drink on the menu. */
export function DrinkCard({ item, onAdd }: DrinkCardProps) {
  const tag = item.tags[0];
  return (
    <article className="drink" aria-labelledby={`drink-${item.id}-name`}>
      <div className="drink__art">
        {tag && <span className="drink__tag">{TAG_LABELS[tag]}</span>}
        <CupIllustration colour={item.colour} pearls={item.pearls} />
      </div>
      <h3 className="drink__name" id={`drink-${item.id}-name`}>
        {item.name}
      </h3>
      {item.description && <p className="drink__description">{item.description}</p>}
      <div className="drink__meta">
        <p className="drink__price">{formatPrice(item.priceCents)}</p>
        {onAdd && (
          <button
            type="button"
            className="drink__add"
            aria-label={`Add ${item.name}`}
            onClick={() => onAdd(item)}
          >
            +
          </button>
        )}
      </div>
    </article>
  );
}
