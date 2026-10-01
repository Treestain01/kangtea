import type { MenuItem } from '@bbt/shared';
import { DrinkCard } from './DrinkCard';
import './menu.css';

type DrinkGridProps = {
  items: MenuItem[];
  onOpen?: (item: MenuItem) => void;
  /** The card lit up by the Surprise me spin, if any. */
  highlightedId?: string | null;
};

/** Responsive grid of drink cards: 2 columns on phones, as many 300px cards as fit from 768px. */
export function DrinkGrid({ items, onOpen, highlightedId = null }: DrinkGridProps) {
  if (items.length === 0) {
    return <p className="drinks__empty">No drinks in this category yet.</p>;
  }
  return (
    <ul className="drinks" aria-label="Drinks">
      {items.map((item) => (
        <li key={item.id}>
          <DrinkCard item={item} onOpen={onOpen} highlighted={item.id === highlightedId} />
        </li>
      ))}
    </ul>
  );
}
