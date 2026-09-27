import type { Store } from '@bbt/shared';
import { CatalogueProvider } from '../../api/CatalogueProvider';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../../api/client';
import { StoresProvider } from '../../store/StoresProvider';
import {
  cartLineFixture,
  createTestStores,
  customisationsFixture,
  menuItemFixture,
} from '../../store/testing';
import type { Stores } from '../../store/types';
import { OrderPanel } from './OrderPanel';

vi.mock('../../api/client', () => ({ fetchStore: vi.fn(), fetchMenu: vi.fn() }));
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

const menuFixture = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [menuItemFixture()],
  customisations: customisationsFixture,
};

const signature = cartLineFixture();
const matcha = cartLineFixture({
  itemId: 'matcha-latte',
  name: 'Matcha Latte',
  unitPriceCents: 790,
});

function renderPanel(stores: Stores = createTestStores(), compact = false) {
  render(
    <StoresProvider stores={stores}>
      <CatalogueProvider storage={null}>
        <MemoryRouter initialEntries={['/order']}>
          <OrderPanel compact={compact} />
        </MemoryRouter>
      </CatalogueProvider>
    </StoresProvider>,
  );
  return stores;
}

describe('OrderPanel cart', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockReset();
    mockedFetchMenu.mockResolvedValue(menuFixture);
  });

  it('shows the empty state with a link to the menu', () => {
    renderPanel();
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the menu' })).toHaveAttribute('href', '/');
  });

  it('keeps the empty state as a hint in compact mode, without a link', () => {
    renderPanel(createTestStores(), true);
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
    expect(
      screen.getByText('Add drinks from the menu and they will appear here.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists lines with their totals and the order total', () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    stores.cart.add(signature);
    stores.cart.add(matcha);
    renderPanel(stores);
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
    renderPanel(stores);
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
    renderPanel(stores);
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Signature Milk Tea' }));
    expect(stores.cart.read()).toEqual([]);
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });

  it('places the order once the store is known and clears the cart', async () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    renderPanel(stores);
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

describe('OrderPanel active order', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockReset();
    mockedFetchMenu.mockResolvedValue(menuFixture);
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
    renderPanel(stores);
    expect(screen.getByText('Received').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: "I've picked it up" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    expect(stores.orders.read()[0]?.status).toBe('cancelled');
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });

  it('hides cancel once the drinks are being made', () => {
    const { stores } = withOrder('making');
    renderPanel(stores);
    expect(screen.getByText('Being made').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });

  it('shows the pickup code when ready and moves to collected on pickup', () => {
    const { stores, order } = withOrder('ready');
    renderPanel(stores);
    expect(screen.getByText(order.pickupCode)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "I've picked it up" }));
    expect(stores.orders.read()[0]?.status).toBe('collected');
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });
});
