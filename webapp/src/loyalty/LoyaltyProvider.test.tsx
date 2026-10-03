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

  it('stamps the card at once when an order is collected, then takes the server card', async () => {
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
    // The server answers only when released, so the provisional card can be seen first.
    let release: (() => void) | undefined;
    const slow = {
      ...loyalty.client,
      earn: (token: string, request: Parameters<typeof loyalty.client.earn>[1]) =>
        new Promise<Awaited<ReturnType<typeof loyalty.client.earn>>>((resolve) => {
          release = () => void loyalty.client.earn(token, request).then(resolve);
        }),
    };
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={slow}>
        <Probe />
      </TestProviders>,
    );
    await waitFor(() => expect(screen.getByText('ready:0:0')).toBeInTheDocument());

    let earning: Promise<void> | undefined;
    act(() => {
      earning = captured?.earnFromOrder(order, (itemId) =>
        itemId === 'milo' ? '#6B4A3A' : undefined,
      );
    });
    expect(screen.getByText('ready:3:0')).toBeInTheDocument();
    const provisional = captured?.state;
    expect(provisional?.kind === 'ready' ? provisional.card.stamps.map((s) => s.id) : []).toEqual([
      'pending:order-1:milo:0',
      'pending:order-1:milo:1',
      'pending:order-1:matcha-latte:0',
    ]);
    expect(provisional?.kind === 'ready' ? provisional.card.stamps[0]?.colour : '').toBe('#6B4A3A');

    await act(async () => {
      release?.();
      await earning;
    });
    const confirmed = captured?.state;
    expect(confirmed?.kind === 'ready' ? confirmed.card.stamps.map((s) => s.id) : []).toEqual([
      'stamp-1',
      'stamp-2',
      'stamp-3',
    ]);
  });

  it('finishes the card on the tenth provisional stamp and starts the next one', async () => {
    const auth = createFakeAuthClient();
    const stores = createTestStores();
    const loyalty = createFakeLoyaltyClient();
    const session = await auth.client.signUp({
      email: 't@example.com',
      password: 'correct horse',
      displayName: 'T',
    });
    stores.session.save(session);
    await loyalty.client.earn(session.token, {
      orderId: 'earlier',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 9 }],
    });
    const never = { ...loyalty.client, earn: () => new Promise<never>(() => {}) };
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={never}>
        <Probe />
      </TestProviders>,
    );
    await waitFor(() => expect(screen.getByText('ready:9:0')).toBeInTheDocument());
    act(() => {
      void captured?.earnFromOrder(order);
    });
    // Nine plus three: the tenth finishes the card, two start the next.
    expect(screen.getByText('ready:12:1')).toBeInTheDocument();
    expect(captured?.state.kind === 'ready' ? captured.state.card.stamps : []).toHaveLength(2);
  });
});
