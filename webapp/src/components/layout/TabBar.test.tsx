import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { StoresProvider } from '../../store/StoresProvider';
import { createTestStores, menuItemFixture } from '../../store/testing';
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
  it('has the four destinations', () => {
    renderAt('/');
    for (const name of ['Home', 'Order', 'History', 'Account']) {
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
      stores.cart.add(menuItemFixture());
      stores.cart.add(menuItemFixture({ id: 'matcha-latte', name: 'Matcha Latte' }));
    });
    expect(screen.getByRole('link', { name: /^Order, 2 in your cart/ })).toHaveTextContent('2');
  });

  it('shows a dot instead of a count while an order is in progress', () => {
    const stores = createTestStores();
    stores.cart.add(menuItemFixture());
    stores.orders.place(stores.cart.read(), 's');
    renderAt('/', stores);
    expect(screen.getByTestId('order-dot')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Order, order in progress/ })).toBeInTheDocument();
  });
});
