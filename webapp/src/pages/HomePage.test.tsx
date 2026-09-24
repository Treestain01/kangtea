import type { Menu, Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../api/client';
import { StoresProvider } from '../store/StoresProvider';
import { createTestStores } from '../store/testing';
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
  items: [
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
      tags: [],
      colour: '#5F8F3E',
      pearls: false,
    },
  ],
};

function renderHome(stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <HomePage />
    </StoresProvider>,
  );
  return stores;
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchMenu.mockReset();
  });

  it('shows a loading state first', () => {
    mockedFetchStore.mockReturnValue(new Promise<never>(() => {}));
    mockedFetchMenu.mockReturnValue(new Promise<never>(() => {}));
    renderHome();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the menu');
    expect(screen.getByText('Finding your store')).toBeInTheDocument();
  });

  it('renders the store, categories and every drink once loaded', async () => {
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockResolvedValue(menu);
    renderHome();
    expect(await screen.findByText('Calamvale Central')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Milk Tea' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('filters drinks by the selected category', async () => {
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockResolvedValue(menu);
    renderHome();
    await screen.findByText('Calamvale Central');
    fireEvent.click(screen.getByRole('button', { name: 'Matcha' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Matcha Latte' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('adds a drink to the cart and announces it', async () => {
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockResolvedValue(menu);
    const stores = renderHome();
    await screen.findByText('Calamvale Central');
    fireEvent.click(screen.getByRole('button', { name: 'Add Signature Milk Tea' }));
    expect(stores.cart.read()).toEqual([
      expect.objectContaining({ itemId: 'signature-milk-tea', quantity: 1 }),
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('Added Signature Milk Tea');
  });

  it('shows an error with a retry that fetches again', async () => {
    mockedFetchStore.mockRejectedValueOnce(new Error('boom'));
    mockedFetchMenu.mockResolvedValue(menu);
    renderHome();
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the menu. boom");

    mockedFetchStore.mockResolvedValue(store);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchStore).toHaveBeenCalledTimes(2);
  });
});
