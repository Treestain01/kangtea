import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { StoresProvider } from '../store/StoresProvider';
import { cartLineFixture, createTestStores } from '../store/testing';
import type { Stores } from '../store/types';
import { HistoryPage } from './HistoryPage';

function renderHistory(stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/order" element={<p>Order page</p>} />
        </Routes>
      </MemoryRouter>
    </StoresProvider>,
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
