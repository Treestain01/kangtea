import type { Store } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStore } from '../api/client';
import { StoresProvider } from '../store/StoresProvider';
import { cartLineFixture, createTestStores } from '../store/testing';
import type { Stores } from '../store/types';
import { AccountPage } from './AccountPage';

vi.mock('../api/client', () => ({ fetchStore: vi.fn() }));
const mockedFetchStore = vi.mocked(fetchStore);

const hours = { open: '00:00', close: '23:59' };
const store: Store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['Shop 29a, Calamvale Central', '662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  phone: '07 3711 4663',
  timezone: 'Australia/Brisbane',
  hours: { mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: hours, sun: hours },
};

function renderAccount(stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <AccountPage />
    </StoresProvider>,
  );
  return stores;
}

describe('AccountPage', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
  });

  it('saves a valid profile and confirms it', () => {
    const stores = renderAccount();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tristan' } });
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'tristan@example.com' },
    });
    fireEvent.click(screen.getByLabelText('Tell me about new drinks and deals'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(stores.account.read()).toMatchObject({
      displayName: 'Tristan',
      email: 'tristan@example.com',
      marketingOptIn: true,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('shows inline errors tied to the fields and saves nothing', () => {
    const stores = renderAccount();
    fireEvent.change(screen.getByLabelText('Email (optional)'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(stores.account.read()).toBeNull();
    const email = screen.getByLabelText('Email (optional)');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('That email address does not look right');
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Tell us what to call you');
  });

  it('starts from the saved profile', () => {
    const stores = createTestStores();
    stores.account.save({
      displayName: 'Tristan',
      phone: '0400 000 000',
      marketingOptIn: false,
      createdAt: '2026-09-24T02:00:00.000Z',
    });
    renderAccount(stores);
    expect(screen.getByLabelText('Name')).toHaveValue('Tristan');
    expect(screen.getByLabelText('Mobile (optional)')).toHaveValue('0400 000 000');
  });

  it('shows the store card with address, hours and a phone link', async () => {
    renderAccount();
    expect(await screen.findByText('Kang Tea Calamvale Central')).toBeInTheDocument();
    expect(screen.getByText('662 Compton Road')).toBeInTheDocument();
    expect(screen.getByText('Calamvale QLD 4116')).toBeInTheDocument();
    expect(screen.getByText(/Open until/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '07 3711 4663' })).toHaveAttribute(
      'href',
      'tel:0737114663',
    );
  });

  it('clears every store only after confirmation', () => {
    const stores = createTestStores();
    stores.cart.add(cartLineFixture());
    stores.account.save({
      displayName: 'Tristan',
      marketingOptIn: false,
      createdAt: '2026-09-24T02:00:00.000Z',
    });
    renderAccount(stores);
    fireEvent.click(screen.getByRole('button', { name: 'Clear my data' }));
    expect(stores.cart.read()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Keep my data' }));
    expect(stores.account.read()).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear my data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear everything' }));
    expect(stores.cart.read()).toEqual([]);
    expect(stores.account.read()).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Your data has been cleared');
  });
});
