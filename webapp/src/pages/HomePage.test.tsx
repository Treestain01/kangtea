import type { Menu, Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../api/client';
import { StoresProvider } from '../store/StoresProvider';
import { cartLineFixture, createTestStores, customisationsFixture } from '../store/testing';
import type { Stores } from '../store/types';
import { HomePage } from './HomePage';

vi.mock('../api/client', () => ({ fetchStore: vi.fn(), fetchMenu: vi.fn() }));

const mockedFetchStore = vi.mocked(fetchStore);
const mockedFetchMenu = vi.mocked(fetchMenu);

const hours = { open: '00:00', close: '23:59' };
const store: Store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  timezone: 'Australia/Brisbane',
  hours: { mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: hours, sun: hours },
};

const menu: Menu = {
  categories: [
    { id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 },
    { id: 'matcha', name: 'Matcha', sortOrder: 1 },
  ],
  customisations: customisationsFixture,
  items: [
    {
      id: 'plain-tea',
      categoryId: 'milk-tea',
      name: 'Plain Tea',
      priceCents: 500,
      currency: 'AUD',
      tags: [],
      colour: '#B07A45',
      pearls: false,
    },
    {
      id: 'signature-milk-tea',
      categoryId: 'milk-tea',
      name: 'Signature Milk Tea',
      priceCents: 750,
      currency: 'AUD',
      tags: ['best-seller'],
      colour: '#B07A45',
      pearls: true,
    },
    {
      id: 'matcha-latte',
      categoryId: 'matcha',
      name: 'Matcha Latte',
      priceCents: 790,
      currency: 'AUD',
      tags: ['new'],
      colour: '#5F8F3E',
      pearls: false,
    },
  ],
};

function renderHome(stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<p>Menu page</p>} />
          <Route path="/order" element={<p>Order page</p>} />
        </Routes>
      </MemoryRouter>
    </StoresProvider>,
  );
  return stores;
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchMenu.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockResolvedValue(menu);
  });

  it('shows a loading state first', () => {
    mockedFetchStore.mockReturnValue(new Promise<never>(() => {}));
    mockedFetchMenu.mockReturnValue(new Promise<never>(() => {}));
    renderHome();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the menu');
    expect(screen.getByText('Finding your store')).toBeInTheDocument();
  });

  it('shows the greeting, store, search and popular drinks with tagged items first', async () => {
    renderHome();
    expect(await screen.findByText('Calamvale Central')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search drinks' })).toBeInTheDocument();
    const names = screen
      .getAllByRole('article')
      .map((article) => article.getAttribute('aria-labelledby'));
    expect(names).toEqual([
      'drink-signature-milk-tea-name',
      'drink-matcha-latte-name',
      'drink-plain-tea-name',
    ]);
    expect(names.length).toBeLessThanOrEqual(4);
    expect(screen.getByRole('link', { name: 'See the full menu' })).toHaveAttribute(
      'href',
      '/menu',
    );
  });

  it('offers category chips that open the menu filtered by that category', async () => {
    renderHome();
    await screen.findByText('Calamvale Central');
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Matcha' }));
    expect(screen.getByText('Menu page')).toBeInTheDocument();
  });

  it('shows the usual drink as a cup when the menu still has it', async () => {
    const stores = createTestStores();
    stores.cart.add(cartLineFixture());
    const order = stores.orders.place(stores.cart.read(), store.id);
    stores.cart.clear();
    stores.orders.setStatus(order.id, 'collected');
    renderHome(stores);
    await screen.findByText('Your usual');
    const usual = screen.getByRole('region', { name: 'Your usual' });
    expect(usual.querySelector('[data-testid="cup"]')).toHaveStyle({ '--tea': '#B07A45' });
  });

  it('sends a search to the menu page', async () => {
    renderHome();
    await screen.findByText('Calamvale Central');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search drinks' }), {
      target: { value: 'matcha' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByText('Menu page')).toBeInTheDocument();
  });

  it('hides Your usual until there is a collected order, then reorders it', async () => {
    const stores = createTestStores();
    stores.cart.add(cartLineFixture());
    const order = stores.orders.place(stores.cart.read(), store.id);
    stores.cart.clear();
    stores.orders.setStatus(order.id, 'collected');
    renderHome(stores);
    await screen.findByText('Calamvale Central');
    expect(screen.getByText('Your usual')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reorder/ }));
    expect(stores.cart.read()).toEqual(order.lines);
    expect(screen.getByText('Order page')).toBeInTheDocument();
  });

  it('has no Your usual with no history', async () => {
    renderHome();
    await screen.findByText('Calamvale Central');
    expect(screen.queryByText('Your usual')).not.toBeInTheDocument();
  });

  it('opens customisation from a popular card and adds to the cart', async () => {
    const stores = renderHome();
    await screen.findByText('Calamvale Central');
    fireEvent.click(screen.getByRole('button', { name: 'Customise Signature Milk Tea' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Pearls/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add to order/ }));
    expect(stores.cart.read()).toEqual([
      expect.objectContaining({ itemId: 'signature-milk-tea', unitPriceCents: 830 }),
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('Added Signature Milk Tea');
  });

  it('shows an error with a retry that fetches again', async () => {
    mockedFetchStore.mockRejectedValueOnce(new Error('boom'));
    renderHome();
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the menu. boom");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchStore).toHaveBeenCalledTimes(2);
  });
});
