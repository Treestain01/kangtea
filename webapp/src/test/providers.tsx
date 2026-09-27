import type { ReactNode } from 'react';
import { CatalogueProvider } from '../api/CatalogueProvider';
import type { AuthClient } from '../auth/AuthClient';
import { AuthProvider } from '../auth/AuthProvider';
import { createFakeAuthClient } from '../auth/testing';
import type { LoyaltyClient } from '../loyalty/LoyaltyClient';
import { LoyaltyProvider } from '../loyalty/LoyaltyProvider';
import { createFakeLoyaltyClient } from '../loyalty/testing';
import { StoresProvider } from '../store/StoresProvider';
import { createTestStores } from '../store/testing';
import type { Stores } from '../store/types';

type TestProvidersProps = {
  stores?: Stores;
  auth?: AuthClient;
  loyalty?: LoyaltyClient;
  children: ReactNode;
};

/**
 * Every provider a page needs, with in memory fakes: stores, the catalogue (no session cache, so
 * the mocked fetches drive it), a fake auth client and a fake loyalty client.
 */
export function TestProviders({
  stores = createTestStores(),
  auth = createFakeAuthClient().client,
  loyalty = createFakeLoyaltyClient().client,
  children,
}: TestProvidersProps) {
  return (
    <StoresProvider stores={stores}>
      <CatalogueProvider storage={null}>
        <AuthProvider client={auth}>
          <LoyaltyProvider client={loyalty}>{children}</LoyaltyProvider>
        </AuthProvider>
      </CatalogueProvider>
    </StoresProvider>
  );
}
