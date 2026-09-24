import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { StoresProvider } from '../../store/StoresProvider';
import { cartLineFixture, createTestStores } from '../../store/testing';
import type { Stores } from '../../store/types';
import { TabBar } from './TabBar';

function renderAt(path: string, stores: Stores = createTestStores()) {
  return render(
    <StoresProvider stores={stores}>
      <MemoryRouter initialEntries={[path]}>
        <TabBar />
      </MemoryRouter>
    </StoresProvider>,
  );
}

describe('TabBar', () => {
  it('has the five destinations', () => {
    renderAt('/');
    for (const name of ['Home', 'Menu', 'Order', 'History', 'Account']) {
      expect(screen.getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it('marks the tab for the current route', () => {
    renderAt('/history');
    expect(screen.getByRole('link', { name: /^History/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /^Home/ })).not.toHaveAttribute('aria-current');
  });

  it('shows the cart line count on the Order tab', () => {
    const stores = createTestStores();
    renderAt('/', stores);
    act(() => {
      stores.cart.add(cartLineFixture());
      stores.cart.add(
        cartLineFixture({ itemId: 'matcha-latte', name: 'Matcha Latte', unitPriceCents: 790 }),
      );
    });
    expect(screen.getByRole('link', { name: /^Order, 2 in your cart/ })).toHaveTextContent('2');
  });

  it('shows the pickup store card when a store is known', () => {
    const hours = { open: '00:00', close: '23:59' };
    render(
      <StoresProvider stores={createTestStores()}>
        <MemoryRouter initialEntries={['/']}>
          <TabBar
            store={{
              id: 'calamvale-central',
              name: 'Kang Tea Calamvale Central',
              shortName: 'Calamvale Central',
              addressLines: ['662 Compton Road'],
              suburb: 'Calamvale',
              state: 'QLD',
              postcode: '4116',
              timezone: 'Australia/Brisbane',
              hours: {
                mon: hours,
                tue: hours,
                wed: hours,
                thu: hours,
                fri: hours,
                sat: hours,
                sun: hours,
              },
            }}
          />
        </MemoryRouter>
      </StoresProvider>,
    );
    expect(screen.getByText('Picking up at')).toBeInTheDocument();
    expect(screen.getByText('Calamvale Central')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Store details' })).toHaveAttribute('href', '/account');
  });

  it('shows a dot instead of a count while an order is in progress', () => {
    const stores = createTestStores();
    stores.cart.add(cartLineFixture());
    stores.orders.place(stores.cart.read(), 's');
    renderAt('/', stores);
    expect(screen.getByTestId('order-dot')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Order, order in progress/ })).toBeInTheDocument();
  });
});
