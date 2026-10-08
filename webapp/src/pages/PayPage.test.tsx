import type { Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestProviders } from '../test/providers';
import {
  cartLineFixture,
  createTestStores,
  customisationsFixture,
  menuItemFixture,
} from '../store/testing';
import type { CartLine, Stores } from '../store/types';
import { PayPage } from './PayPage';
import { fetchMenu, fetchStore, createPaymentIntent, fetchPaymentStatus } from '../api/client';

const confirmPayment = vi.fn();
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn().mockResolvedValue({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment }),
  useElements: () => ({}),
}));

vi.mock('../api/client', () => ({
  fetchStore: vi.fn(),
  fetchMenu: vi.fn(),
  createPaymentIntent: vi.fn(),
  fetchPaymentStatus: vi.fn(),
}));
const mockedFetchStore = vi.mocked(fetchStore);
const mockedFetchMenu = vi.mocked(fetchMenu);
const mockedCreateIntent = vi.mocked(createPaymentIntent);
const mockedFetchStatus = vi.mocked(fetchPaymentStatus);

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

const line: CartLine = cartLineFixture({ unitPriceCents: 900 });
const intent = { paymentIntentId: 'pi_1', clientSecret: 'cs_1', amountCents: 900, currency: 'aud' as const };
const verified = {
  paymentIntentId: 'pi_1',
  status: 'succeeded' as const,
  amountCents: 900,
  currency: 'aud',
  fromKangTea: true,
};

function renderPay({ cart, path = '/pay' }: { cart: CartLine[]; path?: string }): Stores {
  const stores = createTestStores();
  for (const cartLine of cart) stores.cart.add(cartLine);
  render(
    <TestProviders stores={stores}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pay" element={<PayPage />} />
          <Route path="/order" element={<h1>Order route</h1>} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
  return stores;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x');
  mockedFetchStore.mockResolvedValue(store);
  mockedFetchMenu.mockResolvedValue(menuFixture);
  mockedCreateIntent.mockResolvedValue(intent);
  confirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_1' } });
  mockedFetchStatus.mockResolvedValue(verified);
});
afterEach(() => vi.unstubAllEnvs());

describe('PayPage', () => {
  it('redirects an empty cart to the order page', async () => {
    renderPay({ cart: [] });
    expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
  });

  it('creates one intent from the cart and shows the amount on the pay button', async () => {
    renderPay({ cart: [line] });
    expect(await screen.findByRole('button', { name: 'Pay $9.00' })).toBeInTheDocument();
    expect(mockedCreateIntent).toHaveBeenCalledTimes(1);
    expect(mockedCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ expectedTotalCents: 900 }),
      undefined,
    );
  });

  it('places the order with the intent id after a verified success', async () => {
    const stores = renderPay({ cart: [line] });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
    expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
    expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
    expect(stores.cart.read()).toHaveLength(0);
  });

  it('refuses a verified payment whose amount no longer matches the cart', async () => {
    mockedFetchStatus.mockResolvedValue({ ...verified, amountCents: 100 });
    const stores = renderPay({ cart: [line] });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not match');
    expect(stores.orders.read()).toHaveLength(0);
    expect(stores.cart.read()).toHaveLength(1);
  });

  it('refuses a payment that is not ours', async () => {
    mockedFetchStatus.mockResolvedValue({ ...verified, fromKangTea: false });
    const stores = renderPay({ cart: [line] });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not match');
    expect(stores.orders.read()).toHaveLength(0);
  });

  it('keeps the cart and shows an error when verification fails', async () => {
    mockedFetchStatus.mockRejectedValue(new Error('api down'));
    const stores = renderPay({ cart: [line] });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm');
    expect(stores.cart.read()).toHaveLength(1);
    expect(stores.orders.read()).toHaveLength(0);
  });

  it('shows Stripe errors inline and keeps the cart', async () => {
    confirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } });
    const stores = renderPay({ cart: [line] });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your card was declined.');
    expect(stores.cart.read()).toHaveLength(1);
    expect(stores.orders.read()).toHaveLength(0);
  });

  it('verifies a redirect return from the query string without a second confirm', async () => {
    const stores = renderPay({ cart: [line], path: '/pay?payment_intent=pi_1' });
    expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
    expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
