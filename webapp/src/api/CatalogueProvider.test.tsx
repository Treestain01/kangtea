import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage, customisationsFixture, menuItemFixture } from '../store/testing';
import { CatalogueProvider, useCatalogue, useStoreInfo } from './CatalogueProvider';
import { CATALOGUE_CACHE_KEY } from './catalogueCache';
import { fetchMenu, fetchStore } from './client';

vi.mock('./client', () => ({ fetchStore: vi.fn(), fetchMenu: vi.fn() }));
const mockedFetchStore = vi.mocked(fetchStore);
const mockedFetchMenu = vi.mocked(fetchMenu);

const hours = { open: '11:30', close: '20:00' };
const store = {
  id: 'calamvale-central',
  name: 'Kang Tea Calamvale Central',
  shortName: 'Calamvale Central',
  addressLines: ['662 Compton Road'],
  suburb: 'Calamvale',
  state: 'QLD',
  postcode: '4116',
  timezone: 'Australia/Brisbane',
  hours: { mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: hours, sun: hours },
};
const menu = {
  categories: [{ id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 }],
  items: [menuItemFixture()],
  customisations: customisationsFixture,
};

let latestRetry: (() => void) | null = null;

function Probe({ label }: { label: string }) {
  const { catalogue, retry } = useCatalogue();
  const storeInfo = useStoreInfo();
  latestRetry = retry;
  return (
    <p>
      {label}:{catalogue.kind}:{storeInfo?.shortName ?? 'none'}
      {catalogue.kind === 'error' ? `:${catalogue.message}` : ''}
    </p>
  );
}

describe('CatalogueProvider', () => {
  beforeEach(() => {
    mockedFetchStore.mockReset();
    mockedFetchMenu.mockReset();
    mockedFetchStore.mockResolvedValue(store);
    mockedFetchMenu.mockResolvedValue(menu);
  });

  it('fetches the store and menu once and shares them with every consumer', async () => {
    render(
      <CatalogueProvider storage={null}>
        <Probe label="a" />
        <Probe label="b" />
      </CatalogueProvider>,
    );
    expect(await screen.findByText('a:ready:Calamvale Central')).toBeInTheDocument();
    expect(screen.getByText('b:ready:Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchStore).toHaveBeenCalledTimes(1);
    expect(mockedFetchMenu).toHaveBeenCalledTimes(1);
  });

  it('writes the result to the cache and serves the next start from it without fetching', async () => {
    const storage = createMemoryStorage();
    const first = render(
      <CatalogueProvider storage={storage}>
        <Probe label="first" />
      </CatalogueProvider>,
    );
    expect(await screen.findByText('first:ready:Calamvale Central')).toBeInTheDocument();
    expect(storage.getItem(CATALOGUE_CACHE_KEY)).not.toBeNull();
    first.unmount();

    mockedFetchStore.mockClear();
    mockedFetchMenu.mockClear();
    render(
      <CatalogueProvider storage={storage}>
        <Probe label="second" />
      </CatalogueProvider>,
    );
    expect(screen.getByText('second:ready:Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchStore).not.toHaveBeenCalled();
    expect(mockedFetchMenu).not.toHaveBeenCalled();
  });

  it('ignores a cached value that fails the contract and fetches instead', async () => {
    const storage = createMemoryStorage();
    storage.setItem(CATALOGUE_CACHE_KEY, JSON.stringify({ store, menu: { items: [] } }));
    render(
      <CatalogueProvider storage={storage}>
        <Probe label="p" />
      </CatalogueProvider>,
    );
    expect(await screen.findByText('p:ready:Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchStore).toHaveBeenCalledTimes(1);
  });

  it('reports an error and retry fetches again, bypassing the cache', async () => {
    const storage = createMemoryStorage();
    mockedFetchMenu.mockRejectedValueOnce(new Error('GET /menu failed with status 503'));
    render(
      <CatalogueProvider storage={storage}>
        <Probe label="p" />
      </CatalogueProvider>,
    );
    expect(
      await screen.findByText('p:error:none:GET /menu failed with status 503'),
    ).toBeInTheDocument();
    expect(storage.getItem(CATALOGUE_CACHE_KEY)).toBeNull();

    await act(async () => {
      latestRetry?.();
    });
    expect(await screen.findByText('p:ready:Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchMenu).toHaveBeenCalledTimes(2);
    expect(storage.getItem(CATALOGUE_CACHE_KEY)).not.toBeNull();
  });

  it('fetches once even when StrictMode mounts the provider twice', async () => {
    render(
      <StrictMode>
        <CatalogueProvider storage={null}>
          <Probe label="s" />
        </CatalogueProvider>
      </StrictMode>,
    );
    expect(await screen.findByText('s:ready:Calamvale Central')).toBeInTheDocument();
    expect(mockedFetchStore).toHaveBeenCalledTimes(1);
    expect(mockedFetchMenu).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error outside the provider', () => {
    const original = console.error;
    console.error = () => {};
    expect(() => render(<Probe label="x" />)).toThrow(
      'useCatalogue must be used inside a CatalogueProvider',
    );
    console.error = original;
  });
});
