import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { StoresProvider } from '../store/StoresProvider';
import { createTestStores } from '../store/testing';
import type { Stores } from '../store/types';
import type { AuthClient } from './AuthClient';
import { AuthProvider, useAuth, type Auth } from './AuthProvider';
import { createFakeAuthClient } from './testing';

let captured: Auth | null = null;

function Probe() {
  captured = useAuth();
  return <p>{captured.session ? `in:${captured.session.user.email}` : 'out'}</p>;
}

function renderAuth(client: AuthClient, stores: Stores = createTestStores()) {
  render(
    <StoresProvider stores={stores}>
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>
    </StoresProvider>,
  );
  return stores;
}

const credentials = { email: 'tristan@example.com', password: 'correct horse' };

describe('AuthProvider', () => {
  it('signs up, exposes the session, and signs out', async () => {
    const { client } = createFakeAuthClient();
    const stores = renderAuth(client);
    expect(screen.getByText('out')).toBeInTheDocument();

    await act(() => captured!.signUp({ ...credentials, displayName: 'Tristan' }));
    expect(screen.getByText('in:tristan@example.com')).toBeInTheDocument();
    expect(stores.session.read()?.token).toBeTruthy();

    await act(() => captured!.signOut());
    expect(screen.getByText('out')).toBeInTheDocument();
    expect(stores.session.read()).toBeNull();
  });

  it('refreshes a stored session from the api on start', async () => {
    const fake = createFakeAuthClient();
    const stores = createTestStores();
    const session = await fake.client.signUp({ ...credentials, displayName: 'Tristan' });
    await fake.client.updateAccount(session.token, {
      displayName: 'Renamed',
      marketingOptIn: true,
    });
    stores.session.save(session);

    renderAuth(fake.client, stores);
    await waitFor(() => expect(stores.session.read()?.account.displayName).toBe('Renamed'));
    expect(stores.session.read()?.token).toBe(session.token);
  });

  it('keeps the session when the refresh fails for a reason other than 401', async () => {
    const fake = createFakeAuthClient();
    const stores = createTestStores();
    const session = await fake.client.signUp({ ...credentials, displayName: 'Tristan' });
    stores.session.save(session);
    const offline: AuthClient = {
      ...fake.client,
      me: () => Promise.reject(new ApiError(503, 'Accounts need a database.')),
    };

    renderAuth(offline, stores);
    await act(async () => {
      await Promise.resolve();
    });
    expect(stores.session.read()).not.toBeNull();
    expect(screen.getByText('in:tristan@example.com')).toBeInTheDocument();
  });

  it('updates the account in the stored session', async () => {
    const { client } = createFakeAuthClient();
    const stores = renderAuth(client);
    await act(() => captured!.signUp({ ...credentials, displayName: 'Tristan' }));
    await act(() => captured!.updateAccount({ displayName: 'Tris', marketingOptIn: true }));
    expect(stores.session.read()?.account).toMatchObject({
      displayName: 'Tris',
      marketingOptIn: true,
    });
  });

  it('throws a clear error outside the provider', () => {
    const original = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside an AuthProvider');
    console.error = original;
  });
});
