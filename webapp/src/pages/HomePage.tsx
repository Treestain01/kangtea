import type { Menu, MenuItem, OrderLine, Store } from '@bbt/shared';
import { useCallback, useEffect, useState } from 'react';
import { fetchMenu, fetchStore } from '../api/client';
import { AppHeader } from '../components/layout/AppHeader';
import { CategoryChips } from '../components/menu/CategoryChips';
import { CustomiseDrinkDialog } from '../components/menu/CustomiseDrinkDialog';
import { DrinkGrid } from '../components/menu/DrinkGrid';
import { useStores } from '../store/StoresProvider';
import './HomePage.css';

type Catalogue =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; store: Store; menu: Menu };

const ANNOUNCEMENT_MS = 2000;

/** The home screen: header, category filter, drink grid, and the customise dialog. */
export function HomePage() {
  const { cart } = useStores();
  const [catalogue, setCatalogue] = useState<Catalogue>({ kind: 'loading' });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [customising, setCustomising] = useState<MenuItem | null>(null);

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

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), ANNOUNCEMENT_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const addLine = useCallback(
    (line: OrderLine) => {
      cart.add(line);
      setAnnouncement(`Added ${line.name}`);
    },
    [cart],
  );

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
        <DrinkGrid items={items} onOpen={setCustomising} />
      </section>
      <CustomiseDrinkDialog
        item={customising}
        categoryName={
          menu.categories.find((category) => category.id === customising?.categoryId)?.name
        }
        customisations={menu.customisations}
        onAdd={addLine}
        onClose={() => setCustomising(null)}
      />
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
    </>
  );
}
