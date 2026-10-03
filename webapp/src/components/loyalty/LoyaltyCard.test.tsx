import { fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'Your stamps' })).toBeInTheDocument();
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

  it('flips to show the drink behind each stamp, and back', async () => {
    const { auth, stores, token } = await signedIn();
    const loyalty = createFakeLoyaltyClient((id) => (id === 'milo' ? '#6B4A3A' : '#9DBA78'));
    await loyalty.client.earn(token, {
      orderId: 'o1',
      lines: [
        { itemId: 'milo', name: 'Milo', quantity: 1 },
        { itemId: 'matcha-latte', name: 'Matcha Latte', quantity: 1 },
      ],
    });
    renderCard({ stores, auth: auth.client, loyalty: loyalty.client });
    fireEvent.click(await screen.findByRole('button', { name: 'See what filled the card' }));
    const history = screen.getByRole('list', { name: 'Drinks that earned the stamps' });
    expect(
      within(history)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Stamp 1 · Milo', 'Stamp 2 · Matcha Latte']);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the card' }));
    expect(screen.getByRole('button', { name: 'See what filled the card' })).toBeInTheDocument();
  });

  it('keeps filling the next card once one is full, with the free drink noted above it', async () => {
    const { auth, stores, token } = await signedIn();
    const loyalty = createFakeLoyaltyClient();
    await loyalty.client.earn(token, {
      orderId: 'o1',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 12 }],
    });
    renderCard({ stores, auth: auth.client, loyalty: loyalty.client });
    expect(await screen.findByText(/You have a free drink to claim/)).toHaveTextContent(
      'You have a free drink to claim. It comes off your next order. Toppings are still charged.',
    );
    // The two stamps past ten already sit on the next card; nothing here asks to redeem.
    expect(screen.getByText('2 of 10')).toBeInTheDocument();
    expect(screen.getByText('8 more to a free drink.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /free drink/i })).not.toBeInTheDocument();
  });

  it('counts two finished cards as two free drinks', async () => {
    const { auth, stores, token } = await signedIn();
    const loyalty = createFakeLoyaltyClient();
    await loyalty.client.earn(token, {
      orderId: 'o1',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 20 }],
    });
    renderCard({ stores, auth: auth.client, loyalty: loyalty.client });
    expect(await screen.findByText(/You have 2 free drinks to claim/)).toBeInTheDocument();
    expect(screen.getByText('0 of 10')).toBeInTheDocument();
  });
});
