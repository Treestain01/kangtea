import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeAuthClient } from '../../auth/testing';
import { createFakeLoyaltyClient } from '../../loyalty/testing';
import { createTestStores } from '../../store/testing';
import { TestProviders } from '../../test/providers';
import { PearlJar } from './PearlJar';

describe('PearlJar', () => {
  it('renders nothing while signed out', () => {
    render(
      <TestProviders>
        <PearlJar />
      </TestProviders>,
    );
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('holds one pearl per stamp ever earned, across cards', async () => {
    const auth = createFakeAuthClient();
    const stores = createTestStores();
    const session = await auth.client.signUp({
      email: 't@example.com',
      password: 'correct horse',
      displayName: 'T',
    });
    stores.session.save(session);
    const loyalty = createFakeLoyaltyClient();
    await loyalty.client.earn(session.token, {
      orderId: 'o1',
      lines: [{ itemId: 'milo', name: 'Milo', quantity: 12 }],
    });
    render(
      <TestProviders stores={stores} auth={auth.client} loyalty={loyalty.client}>
        <PearlJar />
      </TestProviders>,
    );
    const jar = await screen.findByRole('region', { name: 'Pearl jar' });
    expect(jar).toHaveTextContent('12 pearls');
    expect(jar.querySelectorAll('.jar__pearl')).toHaveLength(12);
  });
});
