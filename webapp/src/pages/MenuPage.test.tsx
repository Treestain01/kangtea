import type { Menu, Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../api/client';
import { StoresProvider } from '../store/StoresProvider';
import { createTestStores, customisationsFixture, menuItemFixture } from '../store/testing';
import type { Stores } from '../store/types';
import { MenuPage } from './MenuPage';

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
    menuItemFixture(),
    menuItemFixture({
      id: 'matcha-latte',
      categoryId: 'matcha',
      name: 'Matcha Latte',
      description: 'Ceremonial grade',
      priceCents: 790,
    }),
  ],
};

function renderMenu(path = '/menu', stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <MemoryRouter initialEntries={[path]}>
        <MenuPage />
      </MemoryRouter>
    </StoresProvider>,
  );
  return stores;
}

describe('MenuPage', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchMenu.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockResolvedValue(menu);
  });

  it('lists every drink with category chips and a search field', async () => {
    renderMenu();
    expect(await screen.findByRole('heading', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Milk Tea' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search drinks' })).toHaveValue('');
  });

  it('starts filtered from the q parameter', async () => {
    renderMenu('/menu?q=ceremonial');
    await screen.findByRole('heading', { name: 'Menu' });
    expect(screen.getByRole('searchbox', { name: 'Search drinks' })).toHaveValue('ceremonial');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Matcha Latte' })).toBeInTheDocument();
  });

  it('filters as you type and by category together', async () => {
    renderMenu();
    await screen.findByRole('heading', { name: 'Menu' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search drinks' }), {
      target: { value: 'tea' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Matcha' }));
    expect(screen.getByText('No drinks match “tea”.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('article', { name: 'Matcha Latte' })).toBeInTheDocument();
  });

  it('adds a customised drink to the cart', async () => {
    const stores = renderMenu();
    await screen.findByRole('heading', { name: 'Menu' });
    fireEvent.click(screen.getByRole('button', { name: 'Customise Matcha Latte' }));
    fireEvent.click(screen.getByRole('button', { name: /Add to order/ }));
    expect(stores.cart.read()).toEqual([expect.objectContaining({ itemId: 'matcha-latte' })]);
    expect(screen.getByRole('status')).toHaveTextContent('Added Matcha Latte');
  });
});
