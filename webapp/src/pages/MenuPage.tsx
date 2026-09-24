import type { MenuItem, OrderLine } from '@bbt/shared';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCatalogue } from '../api/useCatalogue';
import { SearchBar } from '../components/home/SearchBar';
import { CategoryChips } from '../components/menu/CategoryChips';
import { CustomiseDrinkDialog } from '../components/menu/CustomiseDrinkDialog';
import { DrinkGrid } from '../components/menu/DrinkGrid';
import { matchesQuery } from '../lib/popular';
import { useStores } from '../store/StoresProvider';
import './MenuPage.css';

const ANNOUNCEMENT_MS = 2000;

/** The full menu: search, category filter, every drink, and the customise sheet. */
export function MenuPage() {
  const { cart } = useStores();
  const { catalogue, retry } = useCatalogue();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [customising, setCustomising] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), ANNOUNCEMENT_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  const setQuery = (value: string) => {
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  const addLine = useCallback(
    (line: OrderLine) => {
      cart.add(line);
      setAnnouncement(`Added ${line.name}`);
    },
    [cart],
  );

  if (catalogue.kind === 'error') {
    return (
      <div className="menu__error" role="alert">
        <p>We couldn't load the menu. {catalogue.message}</p>
        <button type="button" className="menu__retry" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (catalogue.kind === 'loading') {
    return (
      <p className="menu__loading" role="status">
        Loading the menu
      </p>
    );
  }

  const { menu } = catalogue;
  const items = menu.items.filter(
    (item) =>
      (selectedCategory === null || item.categoryId === selectedCategory) &&
      matchesQuery(item, query),
  );

  return (
    <section className="menu" aria-labelledby="menu-heading">
      <div className="menu__top">
        <h2 id="menu-heading" className="menu__heading">
          Menu
        </h2>
        <SearchBar value={query} onChange={setQuery} />
      </div>
      <CategoryChips
        categories={menu.categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
      {items.length === 0 && query ? (
        <div className="menu__empty">
          <p>No drinks match “{query}”.</p>
          <button type="button" className="menu__retry" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      ) : (
        <DrinkGrid items={items} onOpen={setCustomising} />
      )}
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
    </section>
  );
}
