import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createFakeAuthClient } from '../../auth/testing';
import { createFakeLoyaltyClient } from '../../loyalty/testing';
import { createTestStores } from '../../store/testing';
import { TestProviders } from '../../test/providers';
import { LoyaltyCard } from './LoyaltyCard';

async function signedIn() {
  const auth = createFakeAuthClient();
  const stores = createTestStores();
  const session = await auth.client.signUp({
    email: 't@example.com',
    password: 'correct horse',
    displayName: 'T',
  });
  stores.session.save(session);
  return { auth, stores, token: session.token };
}

function renderCard(props: Omit<Parameters<typeof TestProviders>[0], 'children'>) {
  return render(
    <TestProviders {...props}>
      <MemoryRouter>
        <LoyaltyCard />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('LoyaltyCard', () => {
  it('invites a signed out person to sign in', () => {
    renderCard({});
    expect(screen.getByRole('heading', { name: 'Your pearls' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to start collecting' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(screen.queryByRole('list', { name: 'Stamps on this card' })).not.toBeInTheDocument();
  });

  it('shows ten stamps with the earned ones named after their drinks', async () => {
    const { auth, stores, token } = await signedIn();
    const loyalty = createFakeLoyaltyClient((id) => (id === 'milo' ? '#6B4A3A' : '#9DBA78'));
    await loyalty.client.earn(token, {
      orderId: 'o1',
      lines: [
        { itemId: 'milo', name: 'Milo', quantity: 2 },
        { itemId: 'matcha-latte', name: 'Matcha Latte', quantity: 1 },
      ],
    });
    renderCard({ stores, auth: auth.client, loyalty: loyalty.client });
    const list = await screen.findByRole('list', { name: 'Stamps on this card' });
    const stamps = within(list).getAllByRole('listitem');
    expect(stamps).toHaveLength(10);
    expect(within(list).getAllByRole('img', { name: 'Milo' })).toHaveLength(2);
    expect(within(list).getByRole('img', { name: 'Matcha Latte' })).toBeInTheDocument();
    expect(within(list).getAllByRole('img', { name: 'Still to earn' })).toHaveLength(6);
    expect(
      within(list).getByRole('img', { name: 'Free drink, still to earn' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 of 10')).toBeInTheDocument();
    expect(screen.getByText('7 more to a free drink.')).toBeInTheDocument();
  });

  it('offers the free drink when the card is full and starts fresh after using it', async () => {
    const { auth, stores, token } = await signedIn();
    const loyalty = createFakeLoyaltyClient();
    await loyalty.client.earn(token, {
      orderId: 'o1',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 11 }],
    });
    renderCard({ stores, auth: auth.client, loyalty: loyalty.client });
    expect(await screen.findByText('Card full')).toBeInTheDocument();
    expect(screen.getByText(/Your next drink is free/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use my free drink' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));
    expect(screen.getByRole('button', { name: 'Use my free drink' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use my free drink' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes, use it now' }));
    });
    await waitFor(() => expect(screen.getByText('1 of 10')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Use my free drink' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Free drink used');
  });

  it('shows the api message when redeeming fails', async () => {
    const { auth, stores, token } = await signedIn();
    const loyalty = createFakeLoyaltyClient();
    await loyalty.client.earn(token, {
      orderId: 'o1',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 10 }],
    });
    const failing = {
      ...loyalty.client,
      redeem: () => Promise.reject(new Error('offline')),
    };
    renderCard({ stores, auth: auth.client, loyalty: failing });
    fireEvent.click(await screen.findByRole('button', { name: 'Use my free drink' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes, use it now' }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });
});
