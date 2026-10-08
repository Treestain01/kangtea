import { STAMPS_PER_CARD, type LoyaltyCard, type Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeAuthClient } from '../auth/testing';
import type { AuthClient } from '../auth/AuthClient';
import type { LoyaltyClient } from '../loyalty/LoyaltyClient';
import { TestProviders } from '../test/providers';
import {
  cartLineFixture,
  createTestStores,
  customisationsFixture,
  menuItemFixture,
} from '../store/testing';
import type { CartLine, Stores } from '../store/types';
import { appearanceFromTheme, PayPage } from './PayPage';
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
const intent = {
  paymentIntentId: 'pi_1',
  clientSecret: 'cs_1',
  amountCents: 900,
  currency: 'aud' as const,
};
const verified = {
  paymentIntentId: 'pi_1',
  status: 'succeeded' as const,
  amountCents: 900,
  currency: 'aud',
  fromKangTea: true,
};

/** The /order stand-in also prints a notice carried in navigation state, as OrderPanel does. */
function OrderStub() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  return (
    <>
      <h1>Order route</h1>
      {notice && <p role="status">{notice}</p>}
    </>
  );
}

function renderPay({
  cart,
  path = '/pay',
  stores = createTestStores(),
  auth,
  loyalty,
}: {
  cart: CartLine[];
  path?: string;
  stores?: Stores;
  auth?: AuthClient;
  loyalty?: LoyaltyClient;
}): Stores {
  for (const cartLine of cart) stores.cart.add(cartLine);
  render(
    <TestProviders stores={stores} auth={auth} loyalty={loyalty}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pay" element={<PayPage />} />
          <Route path="/order" element={<OrderStub />} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
  return stores;
}

const fullCard: LoyaltyCard = {
  stampsPerCard: STAMPS_PER_CARD,
  stamps: [],
  earned: STAMPS_PER_CARD,
  redeemed: 0,
  available: 1,
  complete: true,
};

/** A signed-in session saved into the stores, so the loyalty card loads. */
async function signedInStores(): Promise<{ stores: Stores; auth: AuthClient; token: string }> {
  const auth = createFakeAuthClient();
  const session = await auth.client.signUp({
    email: 't@example.com',
    password: 'correct horse',
    displayName: 'T',
  });
  const stores = createTestStores();
  stores.session.save(session);
  return { stores, auth: auth.client, token: session.token };
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

describe('appearanceFromTheme', () => {
  it('dresses the Payment Element from the theme tokens, border and font included', () => {
    const tokens: Record<string, string> = {
      '--color-accent': '#084986',
      '--color-surface': '#fffdf9',
      '--color-text': '#2b2826',
      '--color-border': '#d8d2c7',
      '--font-body': 'Inter, sans-serif',
      '--radius-md': '8px',
    };
    const appearance = appearanceFromTheme((name) => tokens[name] ?? '');
    expect(appearance.variables).toMatchObject({
      colorPrimary: '#084986',
      colorBackground: '#fffdf9',
      colorText: '#2b2826',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px',
    });
    expect(appearance.rules?.['.Input']).toEqual({ borderColor: '#d8d2c7' });
  });

  it('omits what the theme does not define rather than inventing values', () => {
    const appearance = appearanceFromTheme(() => '');
    expect(appearance.variables.colorPrimary).toBeUndefined();
    expect(appearance.rules).toBeUndefined();
  });
});

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

  it('waits for the loyalty card before creating the intent, then prices the free drink in', async () => {
    const { stores, auth, token } = await signedInStores();
    let releaseCard!: () => void;
    const loyalty: LoyaltyClient = {
      card: () =>
        new Promise((resolve) => {
          releaseCard = () => resolve(fullCard);
        }),
      earn: async () => fullCard,
      redeem: async () => ({ ...fullCard, redeemed: 1, available: 0, complete: false }),
    };
    mockedCreateIntent.mockResolvedValue({ ...intent, amountCents: 150 });
    mockedFetchStatus.mockResolvedValue({ ...verified, amountCents: 150 });
    renderPay({ cart: [line], stores, auth, loyalty });
    // While the card is loading, no intent may exist: it would be priced without the free drink.
    await screen.findByRole('status');
    expect(mockedCreateIntent).not.toHaveBeenCalled();
    releaseCard();
    // Line 900, fixture menu price 750: the free drink takes 750 off, leaving $1.50.
    expect(await screen.findByRole('button', { name: 'Pay $1.50' })).toBeInTheDocument();
    expect(mockedCreateIntent).toHaveBeenCalledTimes(1);
    expect(mockedCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedTotalCents: 150,
        freeDrink: { lineIndex: 0, cents: 750 },
      }),
      token,
    );
  });

  it('retries verification without a second charge after a post-payment failure', async () => {
    mockedFetchStatus.mockRejectedValueOnce(new Error('api down'));
    const stores = renderPay({ cart: [line] });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $9.00' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('payment went through');
    expect(stores.cart.read()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm order' }));
    expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
    expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
    expect(confirmPayment).toHaveBeenCalledTimes(1);
  });

  it('shows the free drink notice at the order when the redeem fails after payment', async () => {
    const { stores, auth } = await signedInStores();
    const loyalty: LoyaltyClient = {
      card: async () => fullCard,
      earn: async () => fullCard,
      redeem: async () => {
        throw new Error('loyalty down');
      },
    };
    mockedCreateIntent.mockResolvedValue({ ...intent, amountCents: 150 });
    mockedFetchStatus.mockResolvedValue({ ...verified, amountCents: 150 });
    renderPay({ cart: [line], stores, auth, loyalty });
    fireEvent.click(await screen.findByRole('button', { name: 'Pay $1.50' }));
    expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('free drink');
    expect(stores.orders.read()[0]).toMatchObject({
      paymentIntentId: 'pi_1',
      freeDrink: { lineIndex: 0, cents: 750 },
    });
  });

  it('verifies a redirect return from the query string without a second confirm', async () => {
    const stores = renderPay({ cart: [line], path: '/pay?payment_intent=pi_1' });
    expect(await screen.findByRole('heading', { name: 'Order route' })).toBeInTheDocument();
    expect(stores.orders.read()[0]?.paymentIntentId).toBe('pi_1');
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
