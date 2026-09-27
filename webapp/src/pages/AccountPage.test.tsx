import type { Store } from '@bbt/shared';
import { TestProviders } from '../test/providers';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMenu, fetchStore } from '../api/client';
import { createFakeAuthClient } from '../auth/testing';
import {
  cartLineFixture,
  createTestStores,
  customisationsFixture,
  menuItemFixture,
} from '../store/testing';
import type { Stores } from '../store/types';
import { AccountPage } from './AccountPage';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  fetchStore: vi.fn(),
  fetchMenu: vi.fn(),
}));
const mockedFetchStore = vi.mocked(fetchStore);
const mockedFetchMenu = vi.mocked(fetchMenu);

const menuFixture = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [menuItemFixture()],
  customisations: customisationsFixture,
};

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

function renderAccount(
  stores: Stores = createTestStores(),
  fake = createFakeAuthClient(),
): { stores: Stores; fake: ReturnType<typeof createFakeAuthClient> } {
  render(
    <TestProviders stores={stores} auth={fake.client}>
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    </TestProviders>,
  );
  return { stores, fake };
}

/** The chip that switches between signing in and creating an account. */
function modeChip(name: 'Sign in' | 'Create account') {
  const modes = screen.getByRole('group', { name: 'Sign in or create an account' });
  return within(modes).getByRole('button', { name });
}

/** The submit button of the sign in or create account form. */
function submitButton(formName: 'Sign in' | 'Create your account') {
  return within(screen.getByRole('form', { name: formName })).getByRole('button', {
    name: formName === 'Sign in' ? 'Sign in' : 'Create account',
  });
}

async function createAccount(name = 'Tristan', email = 'tristan@example.com') {
  fireEvent.click(modeChip('Create account'));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse' } });
  await act(async () => {
    fireEvent.submit(submitButton('Create your account'));
  });
  await screen.findByRole('heading', { name: /^Hi / });
}

describe('AccountPage', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockReset();
    mockedFetchMenu.mockResolvedValue(menuFixture);
  });

  describe('signed out', () => {
    it('offers sign in by default and creates an account on the other tab', async () => {
      const { stores } = renderAccount();
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      await createAccount();
      expect(stores.session.read()?.user.email).toBe('tristan@example.com');
      expect(screen.getByText('tristan@example.com')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('Tristan');
    });

    it('shows field errors before calling the api', async () => {
      renderAccount();
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
      await act(async () => {
        fireEvent.submit(submitButton('Sign in'));
      });
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'That email address does not look right',
      );
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        'Use at least 8 characters',
      );
    });

    it('shows the api message for a wrong password', async () => {
      const fake = createFakeAuthClient();
      await fake.client.signUp({
        email: 'tristan@example.com',
        password: 'correct horse',
        displayName: 'Tristan',
      });
      renderAccount(createTestStores(), fake);
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'tristan@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong horse!' } });
      await act(async () => {
        fireEvent.submit(submitButton('Sign in'));
      });
      expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    });

    it('shows the api message when the email is taken', async () => {
      const fake = createFakeAuthClient();
      await fake.client.signUp({
        email: 'tristan@example.com',
        password: 'correct horse',
        displayName: 'Tristan',
      });
      renderAccount(createTestStores(), fake);
      fireEvent.click(modeChip('Create account'));
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tristan' } });
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'tristan@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse' } });
      await act(async () => {
        fireEvent.submit(submitButton('Create your account'));
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'That email is already registered',
      );
    });
  });

  describe('signed in', () => {
    it('asks new accounts to finish their details, then shows a Hi summary once the mobile is saved', async () => {
      const { stores } = renderAccount();
      await createAccount();
      expect(
        screen.getByRole('heading', { name: 'Hi Tristan, finish your details' }),
      ).toBeInTheDocument();
      expect(screen.getByText('tristan@example.com')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tris' } });
      fireEvent.change(screen.getByLabelText('Mobile'), { target: { value: '0400 000 000' } });
      fireEvent.click(screen.getByLabelText('Tell me about new drinks and deals'));
      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'Save' }));
      });

      expect(await screen.findByRole('heading', { name: 'Hi Tris' })).toBeInTheDocument();
      const details = screen.getByRole('region', { name: 'Hi Tris' });
      expect(within(details).getByText('tristan@example.com')).toBeInTheDocument();
      expect(within(details).getByText('0400 000 000')).toBeInTheDocument();
      expect(within(details).getByText('Yes please')).toBeInTheDocument();
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
      expect(stores.session.read()?.account).toMatchObject({
        displayName: 'Tris',
        phone: '0400 000 000',
        marketingOptIn: true,
      });
    });

    it('opens the summary straight away for an account that already has a mobile', async () => {
      const fake = createFakeAuthClient();
      const stores = createTestStores();
      const session = await fake.client.signUp({
        email: 'tristan@example.com',
        password: 'correct horse',
        displayName: 'Tristan',
      });
      const account = await fake.client.updateAccount(session.token, {
        displayName: 'Tristan',
        phone: '0400 000 000',
        marketingOptIn: false,
      });
      stores.session.save({ ...session, account });
      renderAccount(stores, fake);
      expect(screen.getByRole('heading', { name: 'Hi Tristan' })).toBeInTheDocument();
      expect(screen.getByText('No thanks')).toBeInTheDocument();
    });

    it('edits from the summary with prefilled fields, and Cancel goes back without saving', async () => {
      const fake = createFakeAuthClient();
      const stores = createTestStores();
      const session = await fake.client.signUp({
        email: 'tristan@example.com',
        password: 'correct horse',
        displayName: 'Tristan',
      });
      const account = await fake.client.updateAccount(session.token, {
        displayName: 'Tristan',
        phone: '0400 000 000',
        marketingOptIn: false,
      });
      stores.session.save({ ...session, account });
      renderAccount(stores, fake);

      fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
      expect(screen.getByRole('heading', { name: 'Edit your details' })).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('Tristan');
      expect(screen.getByLabelText('Mobile')).toHaveValue('0400 000 000');
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Mobile'), { target: { value: '0411 111 111' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByRole('heading', { name: 'Hi Tristan' })).toBeInTheDocument();
      expect(screen.getByText('0400 000 000')).toBeInTheDocument();
      expect(stores.session.read()?.account.phone).toBe('0400 000 000');

      fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
      fireEvent.change(screen.getByLabelText('Mobile'), { target: { value: '0411 111 111' } });
      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'Save' }));
      });
      expect(await screen.findByText('0411 111 111')).toBeInTheDocument();
      expect(stores.session.read()?.account.phone).toBe('0411 111 111');
    });

    it('signs out and returns to the sign in card', async () => {
      const { stores } = renderAccount();
      await createAccount();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
      });
      expect(stores.session.read()).toBeNull();
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('drops a stored session the api no longer accepts', async () => {
      const fake = createFakeAuthClient();
      const stores = createTestStores();
      const session = await fake.client.signUp({
        email: 'tristan@example.com',
        password: 'correct horse',
        displayName: 'Tristan',
      });
      stores.session.save(session);
      fake.expireAll();
      renderAccount(stores, fake);
      await waitFor(() => expect(stores.session.read()).toBeNull());
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('clears the device and signs out only after confirmation', async () => {
      const { stores } = renderAccount();
      await createAccount();
      stores.cart.add(cartLineFixture());
      fireEvent.click(screen.getByRole('button', { name: 'Clear my data' }));
      fireEvent.click(screen.getByRole('button', { name: 'Keep my data' }));
      expect(stores.cart.read()).toHaveLength(1);
      expect(stores.session.read()).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Clear my data' }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Yes, clear everything' }));
      });
      expect(stores.cart.read()).toEqual([]);
      expect(stores.session.read()).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('signed out');
    });
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

  describe('appearance', () => {
    it('offers System, Light and Dark with System chosen by default', () => {
      renderAccount();
      expect(screen.getByRole('group', { name: 'Appearance' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    });

    it('saves the choice as soon as it is made and keeps it through a clear', async () => {
      const { stores } = renderAccount();
      fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
      expect(stores.preferences.read().theme).toBe('dark');
      fireEvent.click(screen.getByRole('button', { name: 'Clear my data' }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Yes, clear everything' }));
      });
      expect(stores.preferences.read().theme).toBe('dark');
    });
  });
});
