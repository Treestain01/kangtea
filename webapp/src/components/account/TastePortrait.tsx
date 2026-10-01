import type { Order } from '@bbt/shared';
import { useCatalogue } from '../../api/useCatalogue';
import { tasteFrom, type Habit } from '../../lib/taste';
import { StaticCup } from '../cup/StaticCup';
import './TastePortrait.css';

type TastePortraitProps = {
  orders: readonly Order[];
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function fact(habit: Habit | null, drinks: number, suffix = ''): string | null {
  if (!habit) return null;
  return `${habit.value}${suffix} on ${habit.count} of ${plural(drinks, 'drink')}`;
}

/**
 * Your taste: a cup drawn from the choices this person makes most, with the facts beside it.
 * Everything comes from the orders already on the device; nothing is sent anywhere.
 */
export function TastePortrait({ orders }: TastePortraitProps) {
  const { catalogue } = useCatalogue();
  const taste = tasteFrom(orders);
  if (!taste) return null;

  const item =
    catalogue.kind === 'ready'
      ? catalogue.menu.items.find((candidate) => candidate.id === taste.favourite.itemId)
      : undefined;
  const customisations = [
    ...(taste.sugar ? [{ name: 'Sugar', value: taste.sugar.value }] : []),
    ...(taste.ice ? [{ name: 'Ice', value: taste.ice.value }] : []),
    ...(taste.topping ? [{ name: 'Topping', value: taste.topping.value }] : []),
  ];
  const facts = [
    `${taste.favourite.name}, ${taste.favourite.count} of ${plural(taste.drinks, 'drink')}`,
    fact(taste.sugar, taste.drinks, ' sugar'),
    fact(taste.ice, taste.drinks),
    fact(taste.topping, taste.drinks),
  ].filter((line): line is string => line !== null);

  return (
    <section className="taste" aria-labelledby="taste-heading">
      {item && (
        <div className="taste__cup">
          <StaticCup
            colour={item.colour}
            pearls={item.pearls}
            customisations={customisations}
            label={`${taste.favourite.name} the way you usually have it`}
          />
        </div>
      )}
      <div className="taste__text">
        <h3 id="taste-heading" className="taste__heading">
          Your taste
        </h3>
        <p className="taste__from">
          From {plural(taste.orders, 'order')} picked up on this device.
        </p>
        <ul className="taste__facts">
          {facts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
