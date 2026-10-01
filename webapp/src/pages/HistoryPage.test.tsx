import type { Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../api/client';
import {
  cartLineFixture,
  createTestStores,
  customisationsFixture,
  menuItemFixture,
} from '../store/testing';
import type { Stores } from '../store/types';
import { TestProviders } from '../test/providers';
import { HistoryPage } from './HistoryPage';

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

const menu = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [
    menuItemFixture(),
    menuItemFixture({ id: 'matcha-latte', name: 'Matcha Latte', colour: '#9DBA78', pearls: false }),
  ],
  customisations: customisationsFixture,
};

function renderHistory(stores: Stores = createTestStores()) {
  render(
    <TestProviders stores={stores}>
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/order" element={<p>Order page</p>} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
  return stores;
}

function finishedOrder(stores: Stores, status: 'collected' | 'cancelled', placedAt: string) {
  stores.cart.add(cartLineFixture());
  stores.cart.add(cartLineFixture());
  stores.cart.add(
    cartLineFixture({ itemId: 'matcha-latte', name: 'Matcha Latte', unitPriceCents: 790 }),
  );
  const order = stores.orders.place(stores.cart.read(), 's', new Date(placedAt));
  stores.cart.clear();
  stores.orders.setStatus(order.id, status);
  return order;
}

describe('HistoryPage', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockReset();
    mockedFetchMenu.mockResolvedValue(menu);
  });

  it('shows the empty state with a link to the menu', () => {
    renderHistory();
    expect(screen.getByText('No orders yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the menu' })).toHaveAttribute('href', '/');
  });

  it('lists finished orders newest first with status, summary and total', () => {
    const stores = createTestStores();
    finishedOrder(stores, 'collected', '2026-09-20T02:00:00.000Z');
    finishedOrder(stores, 'cancelled', '2026-09-23T02:00:00.000Z');
    renderHistory(stores);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent('Cancelled');
    expect(articles[1]).toHaveTextContent('Collected');
    expect(articles[0]).toHaveTextContent('2 × Signature Milk Tea, 1 × Matcha Latte');
    expect(articles[0]).toHaveTextContent('$22.90');
    expect(articles[0]?.querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-09-23T02:00:00.000Z',
    );
  });

  it('draws each drink as a cup once the menu is known, three at most', async () => {
    const stores = createTestStores();
    finishedOrder(stores, 'collected', '2026-09-20T02:00:00.000Z');
    renderHistory(stores);
    const article = screen.getByRole('article');
    await vi.waitFor(() => expect(article.querySelectorAll('svg.staticcup')).toHaveLength(3));
    // Two milk teas with pearls and one matcha without.
    const withPearls = [...article.querySelectorAll('svg.staticcup')].filter(
      (svg) => svg.querySelectorAll('use[href="#kt-pearl"]').length > 0,
    );
    expect(withPearls).toHaveLength(2);
    expect(article).not.toHaveTextContent('more');
  });

  it('does not list an order that is still in progress', () => {
    const stores = createTestStores();
    stores.cart.add(cartLineFixture());
    stores.orders.place(stores.cart.read(), 's');
    renderHistory(stores);
    expect(screen.getByText('No orders yet.')).toBeInTheDocument();
  });

  it('puts a past order back in the cart and goes to the Order page', () => {
    const stores = createTestStores();
    const order = finishedOrder(stores, 'collected', '2026-09-20T02:00:00.000Z');
    renderHistory(stores);
    fireEvent.click(screen.getByRole('button', { name: 'Order again' }));
    expect(stores.cart.read()).toEqual(order.lines);
    expect(screen.getByText('Order page')).toBeInTheDocument();
  });
});
