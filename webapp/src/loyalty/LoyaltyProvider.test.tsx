import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeAuthClient } from '../auth/testing';
import { createTestStores } from '../store/testing';
import { TestProviders } from '../test/providers';
import { useLoyalty, type Loyalty } from './LoyaltyProvider';
import { createFakeLoyaltyClient } from './testing';

let captured: Loyalty | null = null;

function Probe() {
  captured = useLoyalty();
  const { state } = captured;
  return (
    <p>
      {state.kind}
      {state.kind === 'ready' ? `:${state.card.earned}:${state.card.available}` : ''}
    </p>
  );
}

const order = {
  id: 'order-1',
  storeId: 'calamvale-central',
  lines: [
    { itemId: 'milo', name: 'Milo', unitPriceCents: 700, quantity: 2, customisations: [] },
    {
      itemId: 'matcha-latte',
      name: 'Matcha Latte',
      unitPriceCents: 700,
      quantity: 1,
      customisations: [],
    },
  ],
  totalCents: 2100,
  status: 'collected' as const,
  placedAt: '2026-09-27T01:00:00.000Z',
  updatedAt: '2026-09-27T01:05:00.000Z',
  pickupCode: 'K7PQ',
};

describe('LoyaltyProvider', () => {
  it('is signed out without a session and loads the card once there is one', async () => {
    const auth = createFakeAuthClient();
    const stores = createTestStores();
    const loyalty = createFakeLoyaltyClient();
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={loyalty.client}>
        <Probe />
      </TestProviders>,
    );
    expect(screen.getByText('signed-out')).toBeInTheDocument();

    const session = await auth.client.signUp({
      email: 't@example.com',
      password: 'correct horse',
      displayName: 'T',
    });
    act(() => stores.session.save(session));
    await waitFor(() => expect(screen.getByText('ready:0:0')).toBeInTheDocument());
  });

  it('stamps every drink in a collected order and ignores a repeat', async () => {
    const auth = createFakeAuthClient();
    const stores = createTestStores();
    const loyalty = createFakeLoyaltyClient();
    stores.session.save(
      await auth.client.signUp({
        email: 't@example.com',
        password: 'correct horse',
        displayName: 'T',
      }),
    );
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={loyalty.client}>
        <Probe />
      </TestProviders>,
    );
    await screen.findByText('ready:0:0');
    await act(() => captured!.earnFromOrder(order));
    expect(screen.getByText('ready:3:0')).toBeInTheDocument();
    await act(() => captured!.earnFromOrder(order));
    expect(screen.getByText('ready:3:0')).toBeInTheDocument();
  });

  it('does nothing for a signed out person collecting an order', async () => {
    const loyalty = createFakeLoyaltyClient();
    render(
      <TestProviders loyalty={loyalty.client}>
        <Probe />
      </TestProviders>,
    );
    await act(() => captured!.earnFromOrder(order));
    expect(loyalty.stamps).toHaveLength(0);
    expect(screen.getByText('signed-out')).toBeInTheDocument();
  });

  it('goes back to signed out when the session is cleared', async () => {
    const auth = createFakeAuthClient();
    const stores = createTestStores();
    stores.session.save(
      await auth.client.signUp({
        email: 't@example.com',
        password: 'correct horse',
        displayName: 'T',
      }),
    );
    render(
      <TestProviders stores={stores} auth={auth.client}>
        <Probe />
      </TestProviders>,
    );
    await screen.findByText('ready:0:0');
    act(() => stores.session.clear());
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
  });
});
