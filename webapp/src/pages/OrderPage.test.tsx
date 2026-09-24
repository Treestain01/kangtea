import type { Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStore } from '../api/client';
import { StoresProvider } from '../store/StoresProvider';
import { createTestStores, menuItemFixture } from '../store/testing';
import type { Stores } from '../store/types';
import { OrderPage } from './OrderPage';

vi.mock('../api/client', () => ({ fetchStore: vi.fn() }));
const mockedFetchStore = vi.mocked(fetchStore);

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

const signature = menuItemFixture();
const matcha = menuItemFixture({ id: 'matcha-latte', name: 'Matcha Latte', priceCents: 790 });

function renderOrder(stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <MemoryRouter initialEntries={['/order']}>
        <OrderPage />
      </MemoryRouter>
    </StoresProvider>,
  );
  return stores;
}

describe('OrderPage cart', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
  });

  it('shows the empty state with a link to the menu', () => {
    renderOrder();
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the menu' })).toHaveAttribute('href', '/');
  });

  it('lists lines with their totals and the order total', () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    stores.cart.add(signature);
    stores.cart.add(matcha);
    renderOrder(stores);
    expect(screen.getByText('Signature Milk Tea')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('$7.90')).toBeInTheDocument();
    expect(screen.getByText('$22.90')).toBeInTheDocument();
    expect(screen.getByText('Pay at the counter when you collect.')).toBeInTheDocument();
  });

  it('changes quantities and removes lines', () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    stores.cart.add(matcha);
    renderOrder(stores);
    fireEvent.click(screen.getByRole('button', { name: 'Add one Signature Milk Tea' }));
    expect(stores.cart.read()[0]?.quantity).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Signature Milk Tea' }));
    expect(stores.cart.read()[0]?.quantity).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Matcha Latte' }));
    expect(stores.cart.read().map((line) => line.itemId)).toEqual(['signature-milk-tea']);
  });

  it('removes a line when its quantity would drop below one', () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    renderOrder(stores);
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Signature Milk Tea' }));
    expect(stores.cart.read()).toEqual([]);
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });

  it('places the order once the store is known and clears the cart', async () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    renderOrder(stores);
    const place = screen.getByRole('button', { name: 'Place order' });
    expect(place).toBeDisabled();
    await vi.waitFor(() => expect(place).toBeEnabled());
    fireEvent.click(place);
    expect(stores.cart.read()).toEqual([]);
    expect(stores.orders.read()[0]).toMatchObject({
      status: 'received',
      storeId: 'calamvale-central',
      totalCents: 750,
    });
    expect(screen.getByRole('status')).toHaveTextContent("We've got your order");
  });
});

describe('OrderPage active order', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
  });

  function withOrder(status: 'received' | 'making' | 'ready') {
    const stores = createTestStores();
    stores.cart.add(signature);
    const order = stores.orders.place(stores.cart.read(), store.id);
    stores.cart.clear();
    stores.orders.setStatus(order.id, status);
    return { stores, order };
  }

  it('shows the received step and allows cancelling', () => {
    const { stores } = withOrder('received');
    renderOrder(stores);
    expect(screen.getByText('Received').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: "I've picked it up" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    expect(stores.orders.read()[0]?.status).toBe('cancelled');
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });

  it('hides cancel once the drinks are being made', () => {
    const { stores } = withOrder('making');
    renderOrder(stores);
    expect(screen.getByText('Being made').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });

  it('shows the pickup code when ready and moves to collected on pickup', () => {
    const { stores, order } = withOrder('ready');
    renderOrder(stores);
    expect(screen.getByText(order.pickupCode)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "I've picked it up" }));
    expect(stores.orders.read()[0]?.status).toBe('collected');
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });
});
