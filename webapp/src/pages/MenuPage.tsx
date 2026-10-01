import type { MenuItem, OrderLine } from '@bbt/shared';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { useCatalogue } from '../api/useCatalogue';
import { Loading } from '../components/cup/Loading';
import { SearchBar } from '../components/home/SearchBar';
import { CategoryChips } from '../components/menu/CategoryChips';
import { CustomiseDrinkDialog } from '../components/menu/CustomiseDrinkDialog';
import { DrinkGrid } from '../components/menu/DrinkGrid';
import { SurpriseCard, type SurprisePick } from '../components/menu/SurpriseCard';
import { matchesQuery } from '../lib/popular';
import { useStores } from '../store/StoresProvider';
import './MenuPage.css';

const ANNOUNCEMENT_MS = 2000;

/** What the customise sheet opens on: the drink, and levels to start from when Surprise me chose them. */
type Customising = { item: MenuItem; initial?: { sugarId: string; iceId: string } };

/** The full menu: search, category filter, every drink drawn as its cup, Surprise me, and the customise sheet. */
export function MenuPage() {
  const { cart } = useStores();
  const { catalogue, retry } = useCatalogue();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() =>
    searchParams.get('category'),
  );
  const [announcement, setAnnouncement] = useState('');
  const [customising, setCustomising] = useState<Customising | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

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

  const openItem = useCallback((item: MenuItem) => setCustomising({ item }), []);
  const openPick = useCallback(
    (pick: SurprisePick) =>
      setCustomising({ item: pick.item, initial: { sugarId: pick.sugar.id, iceId: pick.ice.id } }),
    [],
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
    return <Loading>Loading the menu</Loading>;
  }

  const { menu } = catalogue;
  const items = menu.items.filter(
    (item) =>
      (selectedCategory === null || item.categoryId === selectedCategory) &&
      matchesQuery(item, query),
  );
  // The page washes with the chosen family's colour: the first drink in the category sets it.
  const wash = selectedCategory
    ? menu.items.find((item) => item.categoryId === selectedCategory)?.colour
    : undefined;
  const washStyle = { '--wash': wash ?? 'transparent' } as CSSProperties;

  return (
    <section className="menu" aria-labelledby="menu-heading" style={washStyle}>
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
        <DrinkGrid items={items} onOpen={openItem} highlightedId={highlightedId} />
      )}
      <SurpriseCard
        items={items}
        customisations={menu.customisations}
        onHighlight={setHighlightedId}
        onPick={openPick}
      />
      <CustomiseDrinkDialog
        item={customising?.item ?? null}
        initial={customising?.initial}
        categoryName={
          menu.categories.find((category) => category.id === customising?.item.categoryId)?.name
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
