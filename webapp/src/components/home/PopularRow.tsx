import type { MenuItem } from '@bbt/shared';
import { Link } from 'react-router';
import { DrinkCard } from '../menu/DrinkCard';
import './home.css';

type PopularRowProps = {
  items: MenuItem[];
  onOpen: (item: MenuItem) => void;
};

/** "Popular now": a grid of compact cards, two across on phones and four from 768px. */
export function PopularRow({ items, onOpen }: PopularRowProps) {
  return (
    <section className="popular" aria-labelledby="popular-heading">
      <div className="row-head">
        <h2 id="popular-heading">Popular now</h2>
        <Link to="/menu">See the full menu</Link>
      </div>
      <ul className="popular__list" aria-label="Popular drinks">
        {items.map((item) => (
          <li key={item.id}>
            <DrinkCard item={item} onOpen={onOpen} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  );
}
