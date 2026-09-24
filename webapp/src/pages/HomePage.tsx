import type { Menu, Store } from '@bbt/shared';
import { useCallback, useEffect, useState } from 'react';
import { fetchMenu, fetchStore } from '../api/client';
import { AppHeader } from '../components/layout/AppHeader';
import { CategoryChips } from '../components/menu/CategoryChips';
import { DrinkGrid } from '../components/menu/DrinkGrid';
import './HomePage.css';

type Catalogue =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; store: Store; menu: Menu };

/** The home screen: header, category filter, drink grid. */
export function HomePage() {
  const [catalogue, setCatalogue] = useState<Catalogue>({ kind: 'loading' });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogue({ kind: 'loading' });
    Promise.all([fetchStore(), fetchMenu()])
      .then(([store, menu]) => {
        if (!cancelled) setCatalogue({ kind: 'ready', store, menu });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogue({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (catalogue.kind === 'error') {
    return (
      <>
        <AppHeader store={null} />
        <div className="home__error" role="alert">
          <p>We couldn't load the menu. {catalogue.message}</p>
          <button type="button" className="home__retry" onClick={retry}>
            Try again
          </button>
        </div>
      </>
    );
  }

  if (catalogue.kind === 'loading') {
    return (
      <>
        <AppHeader store={null} />
        <p className="home__loading" role="status">
          Loading the menu
        </p>
      </>
    );
  }

  const { store, menu } = catalogue;
  const items =
    selectedCategory === null
      ? menu.items
      : menu.items.filter((item) => item.categoryId === selectedCategory);

  return (
    <>
      <AppHeader store={store} />
      <section className="home__menu" aria-labelledby="menu-heading">
        <h2 id="menu-heading" className="home__heading">
          Menu
        </h2>
        <CategoryChips
          categories={menu.categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <DrinkGrid items={items} />
      </section>
    </>
  );
}
