import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StoresProvider } from './StoresProvider';
import { useAccount, useCart, useOrders } from './hooks';
import { cartLineFixture, createTestStores } from './testing';

function Probe() {
  const cart = useCart();
  const orders = useOrders();
  const account = useAccount();
  return (
    <p>
      cart:{cart.length} orders:{orders.length} name:{account?.displayName ?? 'none'}
    </p>
  );
}

describe('store hooks', () => {
  it('re-render when any store changes', () => {
    const stores = createTestStores();
    render(
      <StoresProvider stores={stores}>
        <Probe />
      </StoresProvider>,
    );
    expect(screen.getByText('cart:0 orders:0 name:none')).toBeInTheDocument();

    act(() => stores.cart.add(cartLineFixture()));
    expect(screen.getByText('cart:1 orders:0 name:none')).toBeInTheDocument();

    act(() => {
      stores.orders.place(stores.cart.read(), 's');
      stores.account.save({
        displayName: 'Tristan',
        marketingOptIn: false,
        createdAt: '2026-09-24T02:00:00.000Z',
      });
    });
    expect(screen.getByText('cart:1 orders:1 name:Tristan')).toBeInTheDocument();
  });

  it('throws a clear error outside the provider', () => {
    const silence = (() => {}) as typeof console.error;
    const original = console.error;
    console.error = silence;
    expect(() => render(<Probe />)).toThrow('useStores must be used inside a StoresProvider');
    console.error = original;
  });
});
