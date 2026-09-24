import type { MenuItem } from '@bbt/shared';
import { DrinkCard } from './DrinkCard';
import './menu.css';

type DrinkGridProps = {
  items: MenuItem[];
  onAdd?: (item: MenuItem) => void;
};

/** Responsive grid of drink cards: 2 columns on phones, 3 from 768px, 4 from 1024px. */
export function DrinkGrid({ items, onAdd }: DrinkGridProps) {
  if (items.length === 0) {
    return <p className="drinks__empty">No drinks in this category yet.</p>;
  }
  return (
    <ul className="drinks" aria-label="Drinks">
      {items.map((item) => (
        <li key={item.id}>
          <DrinkCard item={item} onAdd={onAdd} />
        </li>
      ))}
    </ul>
  );
}
