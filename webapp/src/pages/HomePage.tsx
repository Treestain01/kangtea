import type { MenuItem, Order, OrderLine } from '@bbt/shared';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCatalogue } from '../api/useCatalogue';
import { PopularRow } from '../components/home/PopularRow';
import { SearchBar } from '../components/home/SearchBar';
import { UsualCard } from '../components/home/UsualCard';
import { AppHeader } from '../components/layout/AppHeader';
import { CustomiseDrinkDialog } from '../components/menu/CustomiseDrinkDialog';
import { popularItems } from '../lib/popular';
import { useStores } from '../store/StoresProvider';
import { useOrders } from '../store/hooks';
import { pastOrders } from '../store/orders';
import './HomePage.css';

const ANNOUNCEMENT_MS = 2000;

/** The home screen: greeting and search, your usual, popular drinks, and the customise sheet. */
export function HomePage() {
  const { cart } = useStores();
  const orders = useOrders();
  const navigate = useNavigate();
  const { catalogue, retry } = useCatalogue();
  const [announcement, setAnnouncement] = useState('');
  const [customising, setCustomising] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), ANNOUNCEMENT_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  const addLine = useCallback(
    (line: OrderLine) => {
      cart.add(line);
      setAnnouncement(`Added ${line.name}`);
    },
    [cart],
  );

  const reorder = (order: Order) => {
    cart.replace(order.lines);
    void navigate('/order');
  };

  const search = (query: string) => {
    void navigate(query ? `/menu?q=${encodeURIComponent(query)}` : '/menu');
  };

  const usual = pastOrders(orders).find((order) => order.status === 'collected') ?? null;

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
        <AppHeader store={null} actions={<SearchBar onSubmit={search} />} />
        <p className="home__loading" role="status">
          Loading the menu
        </p>
      </>
    );
  }

  const { store, menu } = catalogue;

  return (
    <div className="home">
      <AppHeader store={store} actions={<SearchBar onSubmit={search} />} />
      {usual && <UsualCard order={usual} onReorder={reorder} />}
      <PopularRow items={popularItems(menu)} onOpen={setCustomising} />
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
    </div>
  );
}
