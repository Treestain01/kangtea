import type { Store } from '@bbt/shared';
import { TestProviders } from '../../test/providers';
import { createFakeAuthClient } from '../../auth/testing';
import { createFakeLoyaltyClient } from '../../loyalty/testing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../../api/client';
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
    <TestProviders stores={stores}>
      <MemoryRouter initialEntries={['/order']}>
        <OrderPanel compact={compact} />
      </MemoryRouter>
    </TestProviders>,
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
    expect(screen.getByText('Total').closest('p')).toHaveTextContent('$22.90');
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

describe('Place order with payments configured', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x');
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockReset();
    mockedFetchMenu.mockResolvedValue(menuFixture);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('navigates to /pay and keeps the cart', async () => {
    const stores = createTestStores();
    stores.cart.add(signature);
    render(
      <TestProviders stores={stores}>
        <MemoryRouter initialEntries={['/order']}>
          <Routes>
            <Route path="/order" element={<OrderPanel />} />
            <Route path="/pay" element={<h1>Pay for your order</h1>} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    );
    const place = screen.getByRole('button', { name: 'Place order' });
    await vi.waitFor(() => expect(place).toBeEnabled());
    fireEvent.click(place);
    expect(await screen.findByRole('heading', { name: 'Pay for your order' })).toBeInTheDocument();
    expect(stores.cart.read()).toHaveLength(1);
    expect(stores.orders.read()).toHaveLength(0);
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
    expect(screen.getByText('Being poured').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });

  it('pours the kitchen cup as the order moves along: empty, then full, then lidded', async () => {
    const { stores, order } = withOrder('received');
    renderPanel(stores);
    const cup = await screen.findByRole('img', { name: 'Signature Milk Tea in the kitchen' });
    const liquid = () => cup.querySelector('.staticcup__liquid') as SVGRectElement;
    const lid = () => cup.querySelector('.staticcup__lid') as SVGUseElement;
    expect(Number(liquid().getAttribute('y'))).toBe(200);
    expect(lid()).toHaveClass('staticcup__lid--off');
    act(() => stores.orders.setStatus(order.id, 'making'));
    expect(liquid().getAttribute('y')).toBe('44');
    expect(lid()).toHaveClass('staticcup__lid--off');
    act(() => stores.orders.setStatus(order.id, 'ready'));
    expect(lid()).not.toHaveClass('staticcup__lid--off');
  });

  it('counts down to ready around the kitchen cup, then says ready', async () => {
    const { stores, order } = withOrder('received');
    renderPanel(stores);
    await screen.findByRole('img', { name: 'Signature Milk Tea in the kitchen' });
    expect(screen.getByText(/^Ready in \d:\d\d$/)).toBeInTheDocument();
    act(() => stores.orders.setStatus(order.id, 'ready'));
    expect(screen.getByText('Ready to collect')).toBeInTheDocument();
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

describe('OrderPanel and the pearl card', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockReset();
    mockedFetchMenu.mockResolvedValue(menuFixture);
  });

  it('earns one stamp per drink when a signed in person collects their order', async () => {
    const auth = createFakeAuthClient();
    const loyalty = createFakeLoyaltyClient();
    const stores = createTestStores();
    stores.session.save(
      await auth.client.signUp({
        email: 't@example.com',
        password: 'correct horse',
        displayName: 'T',
      }),
    );
    stores.cart.add({ ...signature, quantity: 2 });
    stores.cart.add(matcha);
    const order = stores.orders.place(stores.cart.read(), 's');
    stores.orders.setStatus(order.id, 'ready');
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={loyalty.client}>
        <MemoryRouter initialEntries={['/order']}>
          <OrderPanel />
        </MemoryRouter>
      </TestProviders>,
    );
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /picked it up/i }));
    });
    await waitFor(() => expect(loyalty.stamps).toHaveLength(3));
    expect(stores.orders.read()[0]?.status).toBe('collected');
  });

  it('shows the pearl strip under the order for a signed in person, and stamps it on collect', async () => {
    const auth = createFakeAuthClient();
    const loyalty = createFakeLoyaltyClient();
    const stores = createTestStores();
    stores.session.save(
      await auth.client.signUp({
        email: 't@example.com',
        password: 'correct horse',
        displayName: 'T',
      }),
    );
    stores.cart.add(signature);
    const order = stores.orders.place(stores.cart.read(), 's');
    stores.cart.clear();
    stores.orders.setStatus(order.id, 'ready');
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={loyalty.client}>
        <MemoryRouter initialEntries={['/order']}>
          <OrderPanel />
        </MemoryRouter>
      </TestProviders>,
    );
    const strip = await screen.findByRole('region', { name: 'Your stamps' });
    expect(strip).toHaveTextContent('0 of 10');
    expect(strip.querySelectorAll('li')).toHaveLength(10);
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /picked it up/i }));
    });
    await waitFor(() => expect(strip).toHaveTextContent('1 of 10'));
    expect(screen.getByText('Your order is empty.')).toBeInTheDocument();
  });

  async function withFreeDrink(redeem?: () => Promise<never>) {
    const auth = createFakeAuthClient();
    const loyalty = createFakeLoyaltyClient();
    const stores = createTestStores();
    const session = await auth.client.signUp({
      email: 't@example.com',
      password: 'correct horse',
      displayName: 'T',
    });
    stores.session.save(session);
    await loyalty.client.earn(session.token, {
      orderId: 'past',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 10 }],
    });
    // Two signature milk teas with pearls: $7.50 base plus $0.80 of pearls each.
    stores.cart.add({
      ...signature,
      unitPriceCents: 830,
      quantity: 2,
      customisations: [{ name: 'Topping', value: 'Pearls' }],
    });
    stores.cart.add(matcha);
    const client = redeem ? { ...loyalty.client, redeem } : loyalty.client;
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={client}>
        <MemoryRouter initialEntries={['/order']}>
          <OrderPanel />
        </MemoryRouter>
      </TestProviders>,
    );
    return { stores, loyalty, token: session.token };
  }

  it('takes the free drink off the first drink at its menu price, leaving toppings charged', async () => {
    const { stores, loyalty } = await withFreeDrink();
    // 2 × $8.30 + $7.90 = $24.50, less the $7.50 base of one milk tea.
    await screen.findByText('Free drink · Signature Milk Tea');
    expect(screen.getByText('Total').closest('p')).toHaveTextContent('$17.00');
    const place = screen.getByRole('button', { name: 'Place order' });
    await vi.waitFor(() => expect(place).toBeEnabled());
    await act(async () => {
      fireEvent.click(place);
    });
    await waitFor(() => expect(stores.orders.read()[0]).toBeDefined());
    expect(stores.orders.read()[0]).toMatchObject({
      totalCents: 1700,
      freeDrink: { lineIndex: 0, cents: 750 },
    });
    // The free drink is used on the server; the card is a fresh one.
    expect(loyalty.card().redeemed).toBe(1);
    expect(await screen.findByRole('region', { name: 'Your stamps' })).toHaveTextContent('0 of 10');
  });

  it('places at full price and says so when the free drink cannot be used', async () => {
    const { stores } = await withFreeDrink(() => Promise.reject(new Error('offline')));
    const place = screen.getByRole('button', { name: 'Place order' });
    await vi.waitFor(() => expect(place).toBeEnabled());
    await act(async () => {
      fireEvent.click(place);
    });
    await waitFor(() => expect(stores.orders.read()[0]).toBeDefined());
    expect(stores.orders.read()[0]).toMatchObject({ totalCents: 2450 });
    expect(stores.orders.read()[0]?.freeDrink).toBeUndefined();
    expect(screen.getByText(/could not use your free drink/)).toBeInTheDocument();
  });

  it('earns stamps for the paid drinks only when a free drink order is collected', async () => {
    const auth = createFakeAuthClient();
    const loyalty = createFakeLoyaltyClient();
    const stores = createTestStores();
    const session = await auth.client.signUp({
      email: 't@example.com',
      password: 'correct horse',
      displayName: 'T',
    });
    stores.session.save(session);
    stores.cart.add({ ...signature, quantity: 2 });
    const order = stores.orders.place(stores.cart.read(), 's', new Date(), {
      lineIndex: 0,
      cents: 750,
    });
    stores.cart.clear();
    stores.orders.setStatus(order.id, 'ready');
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={loyalty.client}>
        <MemoryRouter initialEntries={['/order']}>
          <OrderPanel />
        </MemoryRouter>
      </TestProviders>,
    );
    expect(await screen.findByText('Free drink · Signature Milk Tea')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /picked it up/i }));
    });
    await waitFor(() => expect(loyalty.stamps).toHaveLength(1));
  });

  it('still collects the order when nobody is signed in', async () => {
    const loyalty = createFakeLoyaltyClient();
    const stores = createTestStores();
    stores.cart.add(signature);
    const order = stores.orders.place(stores.cart.read(), 's');
    stores.orders.setStatus(order.id, 'ready');
    render(
      <TestProviders stores={stores} loyalty={loyalty.client}>
        <MemoryRouter initialEntries={['/order']}>
          <OrderPanel />
        </MemoryRouter>
      </TestProviders>,
    );
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /picked it up/i }));
    });
    expect(stores.orders.read()[0]?.status).toBe('collected');
    expect(loyalty.stamps).toHaveLength(0);
  });
});
